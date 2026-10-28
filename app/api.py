"""
Public REST API for the PrecisionTox Chemical Library.

Serves the same generated data files as the web app (app/static/data/), but with
a stable, documented schema: snake_case keys, typed values (numbers / null),
lists instead of "; "-joined strings and value+unit+source grouped together.

Every chemical and collection endpoint can also be returned as JSON-LD
(schema.org / Bioschemas) via content negotiation:
    Accept: application/ld+json      or      ?format=jsonld

Identifiers (@id / url) are built from CHEM_PUBLIC_BASE_URL, which defaults to
the production deployment so that IRIs stay the same wherever the app runs.
"""
import copy
import json
import os
from collections import Counter, OrderedDict
from functools import lru_cache
from urllib.parse import quote

from flask import Blueprint, Response, render_template, request, url_for
from werkzeug.exceptions import HTTPException

API_VERSION = "1.0.0"
PUBLIC_BASE_URL = (
    os.environ.get("CHEM_PUBLIC_BASE_URL") or "https://dex.precisiontox.org/chem"
).rstrip("/")
API_BASE_URL = f"{PUBLIC_BASE_URL}/api"
VOCAB_URL = f"{API_BASE_URL}/vocab#"
DATASET_ID = f"{PUBLIC_BASE_URL}/"
CITATION_DOI = "https://doi.org/10.1093/toxsci/kfaf126"
CACHE_SECONDS = 60 * 60 * 24

JSON_MIMETYPE = "application/json"
JSONLD_MIMETYPE = "application/ld+json"

JSONLD_CONTEXT = [
    "https://schema.org/",
    {
        "ptx": VOCAB_URL,
        "dct": "http://purl.org/dc/terms/",
    },
]

# Paths follow the main DEX app: unversioned /api/..., plus /api-docs and /openapi.json
api_bp = Blueprint("api", __name__)


# --------------------------------------------------------------------------- #
# Field definitions (source column in chemical_table.json -> API field)
# --------------------------------------------------------------------------- #
IDENTIFIER_FIELDS = OrderedDict([
    ("casrn", "CAS Number"),
    ("dtxsid", "DTXSID"),
    ("pubchem_cid", "PubChem CID"),
    ("drugbank_id", "DrugBank ID"),
    ("inchikey", "INCHIKEY"),
    ("smiles", "SMILES"),
    ("molecular_formula", "Molecular Formula"),
])

# api key, label, value column, unit, source column
PHYSCHEM_FIELDS = [
    ("molecular_weight", "Molecular weight", "Molecular Weight (g/mol)", "g/mol", None),
    ("water_solubility", "Solubility in H2O", "Solubility in H2O (mol/liter)", "mol/L", "Solubility in H2O Source"),
    ("henry_coefficient", "Henry coefficient", "Henry Coefficient (atm*m3/mol)", "atm*m3/mol", "Henry Coefficient Source"),
    ("log_kaw", "Log Kaw", "Log Kaw", None, "Log Kaw Source"),
    ("pka_acid", "pKa (acid)", "pKa (acid)", None, "pKa Source"),
    ("pka_base", "pKa (base)", "pKa (base)", None, "pKa Source"),
    ("log_kow", "Log Kow", "Log Kow", None, "Log Kow Source"),
    ("log_dlipw_ph74", "Log Dlipw (pH 7.4)", "Log Dlipw (pH 7.4)", None, "Log Dlipw Source"),
    ("freely_dissolved_fraction", "Freely dissolved fraction", "Freely Dissolved Fraction", None, None),
    ("density", "Density", "Density (kg/liter)", "kg/L", "Density Source"),
    ("boiling_point", "Boiling point", "Boiling Point (°C)", "°C", "Boiling Point Source"),
    ("melting_point", "Melting point", "Melting Point (°C)", "°C", "Melting Point Source"),
    ("vapor_pressure", "Vapor pressure", "Vapor Pressure (mmHg)", "mmHg", "Vapor Pressure Source"),
]

# api key, label, value column, test system, unit
BASELINE_FIELDS = [
    ("danio_rerio", "Baseline toxicity - D. rerio", "Baseline Toxicity - D. rerio", "Danio rerio", None),
    ("daphnia_magna", "Baseline toxicity - D. magna", "Baseline Toxicity - D. magna", "Daphnia magna", None),
    ("caenorhabditis_elegans", "Baseline toxicity - C. elegans", "Baseline Toxicity - C. elegans", "Caenorhabditis elegans", None),
    ("xenopus_laevis", "Baseline toxicity - X. laevis", "Baseline Toxicity - X. laevis", "Xenopus laevis", None),
    ("drosophila_melanogaster", "Baseline toxicity - D. melanogaster", "Baseline Toxicity - D. melanogaster", "Drosophila melanogaster", None),
    ("hepg2_cells", "Baseline toxicity - HepG2 cells", "Baseline Toxicity - HepG2 cells", "HepG2 cells", None),
    ("hepg2_cells_generic_free_ec10", "Baseline toxicity - HepG2 cells (generic free EC10)",
     "Baseline Toxicity - HepG2 cells (generic micromol/l free EC10)", "HepG2 cells", "µmol/L"),
]

IDENTIFIER_FILTERS = ["casrn", "dtxsid", "inchikey", "pubchem_cid", "drugbank_id"]
LIST_FILTERS = {"use": "use_categories", "toxicity": "toxicity_categories"}
ALLOWED_LIST_PARAMS = set(IDENTIFIER_FILTERS) | set(LIST_FILTERS) | {"q", "name", "vehicle", "limit", "offset", "format"}

# PTox/DEx (https://dex.precisiontox.org/api-docs) identifies chemicals by name
DEX_BASE_URL = "https://dex.precisiontox.org"


# --------------------------------------------------------------------------- #
# Data loading & cleaning
# --------------------------------------------------------------------------- #
def _clean(value):
    if value is None:
        return None
    value = str(value).strip()
    return None if value in ("", "-", "NA", "nan", "None") else value


def _split(value):
    value = _clean(value)
    if value is None:
        return []
    return [part.strip() for part in value.split(";") if part.strip()]


def _number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return value
    return int(number) if number.is_integer() and "." not in value and "e" not in value.lower() else number


def _value(parts):
    values = [_number(part) for part in parts]
    return values[0] if len(values) == 1 else values


def _measurement(row, value_col, unit, source_col):
    parts = _split(row.get(value_col))
    if not parts:
        return None
    return OrderedDict([
        ("value", _value(parts)),
        ("unit", unit),
        ("source", _clean(row.get(source_col)) if source_col else None),
    ])


def _external_links(identifiers, name):
    links = OrderedDict()
    if name:
        links["dex_search"] = f"{DEX_BASE_URL}/api/chemicals/search?q={quote(name)}"
    if identifiers["pubchem_cid"]:
        links["pubchem"] = f"https://pubchem.ncbi.nlm.nih.gov/compound/{identifiers['pubchem_cid']}"
    if identifiers["dtxsid"]:
        links["comptox"] = f"https://comptox.epa.gov/dashboard/chemical/details/{identifiers['dtxsid']}"
    if identifiers["drugbank_id"]:
        links["drugbank"] = f"https://go.drugbank.com/drugs/{identifiers['drugbank_id']}"
    if identifiers["casrn"]:
        links["cas_common_chemistry"] = f"https://commonchemistry.cas.org/detail?cas_rn={identifiers['casrn']}"
    return links


def _build_chemical(row, detail):
    ptx_code = row["Ptox Code"]
    identifiers = OrderedDict((key, _clean(row.get(col))) for key, col in IDENTIFIER_FIELDS.items())
    if identifiers["pubchem_cid"] and identifiers["pubchem_cid"].endswith(".0"):
        identifiers["pubchem_cid"] = identifiers["pubchem_cid"][:-2]

    physchem = OrderedDict(
        (key, _measurement(row, col, unit, source_col))
        for key, _label, col, unit, source_col in PHYSCHEM_FIELDS
    )

    baseline = OrderedDict()
    for key, _label, col, test_system, unit in BASELINE_FIELDS:
        parts = _split(row.get(col))
        baseline[key] = OrderedDict([
            ("value", _value(parts)),
            ("unit", unit),
            ("test_system", test_system),
        ]) if parts else None

    targets = detail.get("targets") if detail else None
    if targets is None:
        targets = _split(row.get("Target Name (T3DB)"))

    aops = []
    for aop in (detail or {}).get("aop", []):
        aop_id = int(aop["AOP_id"])
        aops.append(OrderedDict([
            ("aop_id", aop_id),
            ("name", (aop.get("AOP_name") or "").strip()),
            ("url", f"https://aopwiki.org/aops/{aop_id}"),
        ]))

    name = _clean(row.get("Compound Name")) or _clean(row.get("Compound Name (User)"))
    return OrderedDict([
        ("ptx_code", ptx_code),
        ("name", name),
        ("name_user", _clean(row.get("Compound Name (User)"))),
        ("url", f"{PUBLIC_BASE_URL}/{ptx_code}"),
        ("api_url", f"{API_BASE_URL}/chemical-info/{ptx_code}"),
        ("identifiers", identifiers),
        ("external_links", _external_links(identifiers, name)),
        ("use_categories", _split(row.get("Use Category"))),
        ("toxicity_categories", _split(row.get("Toxicity Category"))),
        ("vehicle", _clean(row.get("Vehicle"))),
        ("physchem_properties", physchem),
        ("baseline_toxicity", baseline),
        ("mechanism_of_action", OrderedDict([
            ("drugbank", _clean(row.get("Mechanism of Action (DrugBank)"))),
            ("t3db", _clean(row.get("Mechanism of Action (T3DB)"))),
        ])),
        ("protein_binding", _clean(row.get("Protein Binding (DrugBank)"))),
        ("targets", targets),
        ("adverse_outcome_pathways", aops),
    ])


def _data_dir():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "data")


@lru_cache(maxsize=1)
def load_chemicals():
    """All chemicals keyed by PTX code. Cached: restart the app after regenerating data."""
    with open(os.path.join(_data_dir(), "chemical_table.json"), encoding="utf-8") as f:
        table = json.load(f, object_pairs_hook=OrderedDict)

    chemicals = OrderedDict()
    for row in table:
        ptx_code = row["Ptox Code"]
        detail_path = os.path.join(_data_dir(), "single_chem", f"{ptx_code}_data.json")
        detail = None
        if os.path.isfile(detail_path):
            with open(detail_path, encoding="utf-8") as f:
                detail = json.load(f)
        chemicals[ptx_code] = _build_chemical(row, detail)
    return chemicals


def get_chemical(ptx_code):
    return load_chemicals().get((ptx_code or "").upper())


# --------------------------------------------------------------------------- #
# JSON-LD (schema.org / Bioschemas)
# --------------------------------------------------------------------------- #
def _property_value(property_id, name, value, unit=None, technique=None):
    prop = OrderedDict([
        ("@type", "PropertyValue"),
        ("propertyID", f"ptx:{property_id}"),
        ("name", name),
        ("value", value),
    ])
    if unit:
        prop["unitText"] = unit
    if technique:
        prop["measurementTechnique"] = technique
    return prop


def chemical_jsonld(chem, with_context=True):
    ids = chem["identifiers"]
    doc = OrderedDict()
    if with_context:
        doc["@context"] = JSONLD_CONTEXT
    doc["@type"] = "MolecularEntity"
    doc["@id"] = chem["url"]
    doc["dct:conformsTo"] = {"@id": "https://bioschemas.org/profiles/MolecularEntity/0.5-RELEASE"}
    doc["identifier"] = chem["ptx_code"]
    doc["name"] = chem["name"]
    if chem["name_user"] and chem["name_user"] != chem["name"]:
        doc["alternateName"] = chem["name_user"]
    doc["url"] = chem["url"]
    if ids["inchikey"]:
        doc["inChIKey"] = ids["inchikey"]
    if ids["smiles"]:
        doc["smiles"] = ids["smiles"]
    if ids["molecular_formula"]:
        doc["molecularFormula"] = ids["molecular_formula"]
    mw = chem["physchem_properties"]["molecular_weight"]
    if mw:
        doc["molecularWeight"] = OrderedDict([
            ("@type", "QuantitativeValue"), ("value", mw["value"]), ("unitText", mw["unit"]),
        ])
    doc["sameAs"] = [url for key, url in chem["external_links"].items() if key != "dex_search"]

    props = []
    for key, label in [("casrn", "CAS Registry Number"), ("dtxsid", "DSSTox Substance ID"),
                       ("pubchem_cid", "PubChem CID"), ("drugbank_id", "DrugBank ID")]:
        if ids[key]:
            props.append(_property_value(key, label, ids[key]))
    for key, label, _col, _unit, _src in PHYSCHEM_FIELDS:
        m = chem["physchem_properties"][key]
        if m and key != "molecular_weight":
            props.append(_property_value(key, label, m["value"], m["unit"], m["source"]))
    for key, label, _col, _system, _unit in BASELINE_FIELDS:
        b = chem["baseline_toxicity"][key]
        if b:
            props.append(_property_value(f"baseline_{key}", label, b["value"], b["unit"]))
    doc["additionalProperty"] = props

    if chem["use_categories"]:
        doc["ptx:useCategory"] = chem["use_categories"]
    if chem["toxicity_categories"]:
        doc["ptx:toxicityCategory"] = chem["toxicity_categories"]
    if chem["vehicle"]:
        doc["ptx:vehicle"] = chem["vehicle"]
    moa = [m for m in chem["mechanism_of_action"].values() if m]
    if moa:
        doc["ptx:mechanismOfAction"] = moa
    if chem["targets"]:
        doc["bioChemInteraction"] = [
            OrderedDict([("@type", "BioChemEntity"), ("name", t)]) for t in chem["targets"]
        ]
    if chem["adverse_outcome_pathways"]:
        doc["ptx:adverseOutcomePathway"] = [
            OrderedDict([
                ("@id", f"https://identifiers.org/aop:{a['aop_id']}"),
                ("name", a["name"]),
                ("url", a["url"]),
            ])
            for a in chem["adverse_outcome_pathways"]
        ]
    doc["isPartOf"] = {"@id": DATASET_ID}
    return doc


def dataset_jsonld(parts=None, with_context=True):
    doc = OrderedDict()
    if with_context:
        doc["@context"] = JSONLD_CONTEXT
    doc.update([
        ("@type", "Dataset"),
        ("@id", DATASET_ID),
        ("dct:conformsTo", {"@id": "https://bioschemas.org/profiles/Dataset/1.0-RELEASE"}),
        ("name", "The PrecisionTox Chemical Library"),
        ("description", (
            "Curated collection of chemicals studied by the PrecisionTox consortium, annotated with "
            "use and toxicity endpoint categories, physico-chemical properties, baseline toxicity in "
            "several test systems, mechanisms of action, molecular targets and adverse outcome pathways."
        )),
        ("url", DATASET_ID),
        ("citation", CITATION_DOI),
        ("creator", OrderedDict([
            ("@type", "Organization"), ("name", "PrecisionTox Consortium"), ("url", "https://precisiontox.org/"),
        ])),
        ("keywords", ["toxicology", "chemicals", "physico-chemical properties", "baseline toxicity",
                      "adverse outcome pathways", "new approach methodologies"]),
        ("isAccessibleForFree", True),
        ("variableMeasured", [label for _k, label, _c, _u, _s in PHYSCHEM_FIELDS]
                             + [label for _k, label, _c, _t, _u in BASELINE_FIELDS]),
        ("distribution", [
            OrderedDict([("@type", "DataDownload"), ("encodingFormat", "text/csv"),
                         ("contentUrl", f"{PUBLIC_BASE_URL}/static/data/chemical_table.csv")]),
            OrderedDict([("@type", "DataDownload"), ("encodingFormat", JSON_MIMETYPE),
                         ("contentUrl", f"{API_BASE_URL}/chemical-info")]),
            OrderedDict([("@type", "DataDownload"), ("encodingFormat", JSONLD_MIMETYPE),
                         ("contentUrl", f"{API_BASE_URL}/chemical-info?format=jsonld")]),
        ]),
    ])
    if parts is not None:
        doc["hasPart"] = parts
    return doc


VOCAB_TERMS = [
    ("useCategory", "Use category", "Main use category of the chemical (e.g. Pharmaceutical, Pesticide)."),
    ("toxicityCategory", "Toxicity endpoint category", "Toxicity endpoint category associated with the chemical."),
    ("vehicle", "Vehicle", "Solvent used to dose the chemical in PrecisionTox experiments."),
    ("mechanismOfAction", "Mechanism of action", "Mechanism of action description (DrugBank / T3DB)."),
    ("adverseOutcomePathway", "Adverse outcome pathway", "AOP-Wiki adverse outcome pathway linked to the chemical."),
]


def vocab_jsonld():
    terms = [
        OrderedDict([
            ("@id", f"ptx:{term}"), ("@type", "rdf:Property"),
            ("rdfs:label", label), ("rdfs:comment", comment),
        ])
        for term, label, comment in VOCAB_TERMS
    ]
    terms += [
        OrderedDict([("@id", f"ptx:{key}"), ("@type", "rdf:Property"), ("rdfs:label", label)])
        for key, label, _c, _u, _s in PHYSCHEM_FIELDS
    ]
    terms += [
        OrderedDict([("@id", f"ptx:baseline_{key}"), ("@type", "rdf:Property"), ("rdfs:label", label)])
        for key, label, _c, _t, _u in BASELINE_FIELDS
    ]
    return OrderedDict([
        ("@context", {
            "ptx": VOCAB_URL,
            "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        }),
        ("@graph", terms),
    ])


# --------------------------------------------------------------------------- #
# Response helpers
# --------------------------------------------------------------------------- #
def wants_jsonld():
    fmt = (request.args.get("format") or "").lower()
    if fmt in ("jsonld", "json-ld"):
        return True
    if fmt == "json":
        return False
    return request.accept_mimetypes.best_match([JSON_MIMETYPE, JSONLD_MIMETYPE]) == JSONLD_MIMETYPE


def json_response(payload, status=200, mimetype=JSON_MIMETYPE):
    body = json.dumps(payload, indent=2, ensure_ascii=False, sort_keys=False)
    return Response(body, status=status, mimetype=mimetype)


def error_response(status, message):
    return json_response({"error": {"status": status, "message": message}}, status=status)


@api_bp.after_request
def add_api_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Vary"] = "Accept"
    if response.status_code == 200:
        response.cache_control.public = True
        response.cache_control.max_age = CACHE_SECONDS
        response.add_etag()
        response.make_conditional(request)
    return response


@api_bp.app_errorhandler(HTTPException)
def handle_http_error(error):
    # JSON errors for API paths only; the rest of the app keeps Flask's default pages.
    if request.path == "/api" or request.path.startswith("/api/"):
        return error_response(error.code, error.description)
    return error


# --------------------------------------------------------------------------- #
# Routes
# --------------------------------------------------------------------------- #
@api_bp.route("/api/")
def index():
    if wants_jsonld():
        return json_response(dataset_jsonld(), mimetype=JSONLD_MIMETYPE)
    response = json_response(OrderedDict([
        ("name", "PrecisionTox Chemical Library API"),
        ("version", API_VERSION),
        ("description", "Read-only access to the PrecisionTox chemical collection."),
        ("documentation", f"{PUBLIC_BASE_URL}/api-docs"),
        ("interactive_documentation", f"{PUBLIC_BASE_URL}/api-docs/swagger"),
        ("openapi", f"{PUBLIC_BASE_URL}/openapi.json"),
        ("citation", CITATION_DOI),
        ("links", OrderedDict([
            ("chemical_info", f"{API_BASE_URL}/chemical-info"),
            ("chemical_categories", f"{API_BASE_URL}/chemical-category/"),
            ("use_categories", f"{API_BASE_URL}/chemical-category/use"),
            ("toxicity_categories", f"{API_BASE_URL}/chemical-category/toxicity"),
            ("dataset_jsonld", f"{API_BASE_URL}/?format=jsonld"),
            ("jsonld_context", f"{API_BASE_URL}/context.jsonld"),
            ("vocabulary", f"{API_BASE_URL}/vocab"),
            ("dex_api", f"{DEX_BASE_URL}/api-docs"),
        ])),
    ]))
    response.headers["Link"] = f'<{PUBLIC_BASE_URL}/openapi.json>; rel="service-desc", <{PUBLIC_BASE_URL}/api-docs>; rel="service-doc"'
    return response


def _param_values(name):
    values = []
    for raw in request.args.getlist(name):
        values += [v.strip().lower() for v in raw.split(",") if v.strip()]
    return values


def _int_param(name, default, minimum=0):
    raw = request.args.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except ValueError:
        value = None
    if value is None or value < minimum:
        raise ValueError(f"'{name}' must be an integer >= {minimum}")
    return value


@api_bp.route("/api/chemical-info")
def list_chemicals():
    unknown = sorted(set(request.args) - ALLOWED_LIST_PARAMS)
    if unknown:
        return error_response(400, f"Unknown query parameter(s): {', '.join(unknown)}. "
                                   f"Allowed: {', '.join(sorted(ALLOWED_LIST_PARAMS))}")
    try:
        limit = _int_param("limit", None, minimum=1)
        offset = _int_param("offset", 0)
    except ValueError as exc:
        return error_response(400, str(exc))

    results = list(load_chemicals().values())

    for key in IDENTIFIER_FILTERS:
        wanted = _param_values(key)
        if wanted:
            results = [c for c in results if (c["identifiers"][key] or "").lower() in wanted]

    for param, field in LIST_FILTERS.items():
        wanted = _param_values(param)
        if wanted:
            results = [c for c in results if any(v.lower() in wanted for v in c[field])]

    names = _param_values("name")
    if names:
        results = [c for c in results
                   if (c["name"] or "").lower() in names or (c["name_user"] or "").lower() in names]

    vehicles = _param_values("vehicle")
    if vehicles:
        results = [c for c in results if (c["vehicle"] or "").lower() in vehicles]

    query = (request.args.get("q") or "").strip().lower()
    if query:
        results = [
            c for c in results
            if any(query in (s or "").lower() for s in
                   (c["ptx_code"], c["name"], c["name_user"], c["identifiers"]["casrn"]))
        ]

    total = len(results)
    page = results[offset:offset + limit] if limit else results[offset:]

    if wants_jsonld():
        parts = [chemical_jsonld(c, with_context=False) for c in page]
        return json_response(dataset_jsonld(parts=parts), mimetype=JSONLD_MIMETYPE)

    return json_response(OrderedDict([
        ("meta", OrderedDict([
            ("total", total), ("offset", offset), ("limit", limit), ("returned", len(page)),
            ("api_version", API_VERSION),
        ])),
        ("data", page),
    ]))


@api_bp.route("/api/chemical-info/<ptx_code>")
def chemical_detail(ptx_code):
    chem = get_chemical(ptx_code)
    if chem is None:
        return error_response(404, f"Chemical '{ptx_code}' not found")
    if wants_jsonld():
        return json_response(chemical_jsonld(chem), mimetype=JSONLD_MIMETYPE)
    return json_response(chem)


CATEGORY_FIELDS = OrderedDict([("use", "use_categories"), ("toxicity", "toxicity_categories")])


def _categories(kind):
    counts = Counter(c for chem in load_chemicals().values() for c in chem[CATEGORY_FIELDS[kind]])
    return [
        OrderedDict([
            ("name", name),
            ("chemical_count", count),
            ("chemicals_url", f"{API_BASE_URL}/chemical-info?{kind}={quote(name)}"),
        ])
        for name, count in sorted(counts.items())
    ]


@api_bp.route("/api/chemical-category/")
def list_all_categories():
    return json_response(OrderedDict([
        ("meta", OrderedDict([("api_version", API_VERSION)])),
        ("data", OrderedDict((kind, _categories(kind)) for kind in CATEGORY_FIELDS)),
    ]))


@api_bp.route("/api/chemical-category/<kind>")
def list_categories(kind):
    if kind not in CATEGORY_FIELDS:
        return error_response(404, "Category type must be 'use' or 'toxicity'")
    data = _categories(kind)
    return json_response(OrderedDict([
        ("meta", OrderedDict([("total", len(data)), ("api_version", API_VERSION)])),
        ("data", data),
    ]))


@api_bp.route("/api/vocab")
def vocab():
    return json_response(vocab_jsonld(), mimetype=JSONLD_MIMETYPE)


@api_bp.route("/api/context.jsonld")
def context():
    # Same role as DEX's /api/context.jsonld: reusable context for the JSON-LD responses
    return json_response({"@context": JSONLD_CONTEXT}, mimetype=JSONLD_MIMETYPE)


@lru_cache(maxsize=1)
def _load_openapi_spec():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "openapi.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f, object_pairs_hook=OrderedDict)


@api_bp.route("/openapi.json")
def openapi_spec():
    spec = OrderedDict(_load_openapi_spec())
    spec["info"] = OrderedDict(spec["info"], version=API_VERSION)
    # Relative server first so "Try it out" hits whichever deployment serves the docs.
    spec["servers"] = [
        {"url": url_for("api.index").rstrip("/"), "description": "This server"},
        {"url": API_BASE_URL, "description": "Production"},
    ]
    return json_response(spec)


SWAGGER_UI_HTML = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PrecisionTox Chemical Library API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: "__SPEC_URL__", dom_id: "#swagger-ui" });
  </script>
</body>
</html>
"""


@api_bp.route("/api-docs/swagger")
def swagger_docs():
    html = SWAGGER_UI_HTML.replace("__SPEC_URL__", url_for("api.openapi_spec"))
    return Response(html, mimetype="text/html")


# --------------------------------------------------------------------------- #
# Human-readable API guide (/api-docs), laid out like the DEX API page
# --------------------------------------------------------------------------- #
# Each endpoint: method, path, description, example request(s) (path + query, Accept header)
API_DOC_SECTIONS = [
    {
        "title": "Chemical Info Endpoints",
        "intro": "Look up the chemicals of the library and all their annotations: identifiers, use and "
                 "toxicity categories, physico-chemical properties, baseline toxicity, mechanisms of action, "
                 "targets and adverse outcome pathways.",
        "endpoints": [
            {"method": "GET", "path": "/api/chemical-info",
             "description": "All chemicals, with optional filters and paging (see Query Parameters).",
             "examples": [("/api/chemical-info", None)]},
            {"method": "GET", "path": "/api/chemical-info?q=bisphenol",
             "description": "Substring search on PTX code, chemical name and CAS number.",
             "examples": [("/api/chemical-info?q=bisphenol", None)]},
            {"method": "GET", "path": "/api/chemical-info?name=Cadmium%20chloride&name=bisphenol%20A",
             "description": "Exact name match. Use it to map the chemical names used by the PTox/DEx API to PTX codes.",
             "examples": [("/api/chemical-info?name=Cadmium%20chloride&name=bisphenol%20A", None)]},
            {"method": "GET", "path": "/api/chemical-info?inchikey=YKYOUMDCQGMQQO-UHFFFAOYSA-L",
             "description": "Lookup by identifier: casrn, dtxsid, inchikey, pubchem_cid or drugbank_id.",
             "examples": [("/api/chemical-info?inchikey=YKYOUMDCQGMQQO-UHFFFAOYSA-L", None)]},
            {"method": "GET", "path": "/api/chemical-info?use=Pharmaceutical&toxicity=Nephrotoxicity&limit=10",
             "description": "Filter by use and toxicity endpoint category, returning the first 10 matches.",
             "examples": [("/api/chemical-info?use=Pharmaceutical&toxicity=Nephrotoxicity&limit=10", None)]},
            {"method": "GET", "path": "/api/chemical-info/{ptx_code}",
             "description": "One chemical by its PrecisionTox code (case-insensitive).",
             "examples": [("/api/chemical-info/PTX001", None)]},
        ],
    },
    {
        "title": "Chemical Category Endpoints",
        "intro": "List the classification categories with the number of chemicals in each. Every category "
                 "links to the chemical-info query that returns its chemicals.",
        "endpoints": [
            {"method": "GET", "path": "/api/chemical-category/",
             "description": "Use and toxicity endpoint categories together.",
             "examples": [("/api/chemical-category/", None)]},
            {"method": "GET", "path": "/api/chemical-category/use",
             "description": "Use categories (e.g. Pharmaceutical, Pesticide).",
             "examples": [("/api/chemical-category/use", None)]},
            {"method": "GET", "path": "/api/chemical-category/toxicity",
             "description": "Toxicity endpoint categories (e.g. Hepatotoxicity, Neurotoxicity).",
             "examples": [("/api/chemical-category/toxicity", None)]},
        ],
    },
    {
        "title": "JSON-LD and Metadata",
        "intro": "Chemical and collection responses are also available as JSON-LD (schema.org / Bioschemas "
                 "MolecularEntity and Dataset), as in the PTox/DEx API. Add format=jsonld or send "
                 "Accept: application/ld+json.",
        "endpoints": [
            {"method": "GET", "path": "/api/chemical-info/{ptx_code}?format=jsonld",
             "description": "One chemical as a Bioschemas MolecularEntity.",
             "examples": [("/api/chemical-info/PTX001?format=jsonld", None),
                          ("/api/chemical-info/PTX001", JSONLD_MIMETYPE)]},
            {"method": "GET", "path": "/api/chemical-info?format=jsonld",
             "description": "The whole collection as a schema.org Dataset, with the chemicals in hasPart.",
             "examples": [("/api/chemical-info?format=jsonld", None)]},
            {"method": "GET", "path": "/api/context.jsonld",
             "description": "JSON-LD context used by the JSON-LD responses.",
             "examples": [("/api/context.jsonld", JSONLD_MIMETYPE)]},
            {"method": "GET", "path": "/api/vocab",
             "description": "Definitions of the ptx: terms used in the JSON-LD responses.",
             "examples": [("/api/vocab", None)]},
            {"method": "GET", "path": "/api/",
             "description": "API index with links to every endpoint; a schema.org Dataset description when JSON-LD is requested.",
             "examples": [("/api/", None)]},
            {"method": "GET", "path": "/openapi.json",
             "description": "OpenAPI 3 specification of this API.",
             "examples": [("/openapi.json", None)]},
        ],
    },
]

API_DOC_PARAMETERS = [
    ("q", "Text", "Substring search on PTX code, name and CAS number."),
    ("name", "Text, repeatable", "Exact chemical name, as used by the PTox/DEx API (case-insensitive)."),
    ("use", "Text, repeatable", "Use category. See /api/chemical-category/use."),
    ("toxicity", "Text, repeatable", "Toxicity endpoint category. See /api/chemical-category/toxicity."),
    ("vehicle", "Text, repeatable", "Dosing vehicle / solvent, e.g. water or DMSO."),
    ("casrn, dtxsid, inchikey, pubchem_cid, drugbank_id", "Text, repeatable", "Exact identifier match."),
    ("limit", "Integer ≥ 1", "Maximum number of results. Default: all."),
    ("offset", "Integer ≥ 0", "Number of results to skip. Default: 0."),
    ("format", "json | jsonld", "Response format. Alternative to the Accept header."),
]

API_DOC_FIELDS = [
    ("meta", "List responses: total (matches before paging), offset, limit, returned, api_version."),
    ("data", "List responses: array of chemicals (or categories)."),
    ("ptx_code, name, name_user", "PrecisionTox code, preferred name and name given by the data provider."),
    ("url, api_url", "Web page of the chemical (also its JSON-LD @id) and its API URL."),
    ("identifiers", "casrn, dtxsid, pubchem_cid, drugbank_id, inchikey, smiles, molecular_formula."),
    ("external_links", "Links to PubChem, CompTox, DrugBank, CAS Common Chemistry and a PTox/DEx search."),
    ("use_categories, toxicity_categories", "Arrays of category names."),
    ("vehicle", "Dosing vehicle / solvent."),
    ("physchem_properties", "Each property is {value, unit, source} or null. value is an array when several values are reported (e.g. pKa)."),
    ("baseline_toxicity", "One entry per test system: {value, unit, test_system} or null."),
    ("mechanism_of_action, protein_binding", "Text from DrugBank and T3DB."),
    ("targets", "Molecular targets (T3DB)."),
    ("adverse_outcome_pathways", "Array of {aop_id, name, url} linking to AOP-Wiki."),
]


def _curl(path, accept):
    header = f" \\\n  -H 'Accept: {accept}'" if accept else ""
    return f"curl '{PUBLIC_BASE_URL}{path}'{header}"


def _example_response():
    """A real chemical-info record, shortened for display."""
    chem = copy.deepcopy(get_chemical("PTX001"))
    if chem is None:
        return None
    for key, keep in (("physchem_properties", 3), ("baseline_toxicity", 2)):
        items = list(chem[key].items())
        chem[key] = OrderedDict(items[:keep] + [("…", f"{len(items) - keep} more")])
    for key in ("mechanism_of_action", "protein_binding"):
        chem.pop(key, None)
    chem["targets"] = chem["targets"][:3]
    chem["adverse_outcome_pathways"] = chem["adverse_outcome_pathways"][:2]
    return json.dumps(chem, indent=2, ensure_ascii=False)


@api_bp.route("/api-docs")
def docs():
    sections = []
    for section in API_DOC_SECTIONS:
        endpoints = [
            dict(endpoint, curls=[_curl(path, accept) for path, accept in endpoint["examples"]])
            for endpoint in section["endpoints"]
        ]
        sections.append(dict(section, endpoints=endpoints))
    return render_template(
        "api_docs.html",
        base_url=PUBLIC_BASE_URL,
        api_version=API_VERSION,
        sections=sections,
        parameters=API_DOC_PARAMETERS,
        fields=API_DOC_FIELDS,
        example_response=_example_response(),
        dex_api_docs=f"{DEX_BASE_URL}/api-docs",
        citation=CITATION_DOI,
    )
