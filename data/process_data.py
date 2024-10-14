import sys
import json
import pandas as pd


def truncate_label(label, length=25):
    if len(label) > 25:
        return label[:25]+"..."
    else:
        return label


def read_drugbank_file(file_path):
    target_cols = ["Prec.Tox code", "DrugBank ID", "organism", "Chemical Target",
                   "Chemical Effect at Target", "known_action", "toxicity"]
    df_drugbank = pd.read_excel(
        file_path,
        usecols=target_cols,
        skiprows=0,
        index_col=None,
        sheet_name="In DrugBank"
    ).rename(columns={"Prec.Tox code": "ptx_code", "DrugBank ID": "drugbank_id"})

    return df_drugbank


def read_properties_file(file_path):
    df = pd.read_excel(
        file_path,
        skiprows=0,
        index_col=None,
    ).rename(columns={
        "compound_name_user": "chem_name_user",
        "dtxsid_comptox_neutral": "DTXSID",
        "inchikey_neutral": "INCHIKEY",
        "smiles_canonical_neutral": "SMILES",
        "cas_neutral": "CASRN"
    })
    df = df.drop(columns=["DTXSID", "INCHIKEY", "SMILES", "CASRN"], axis=1)
    df.fillna("NA", inplace=True)
    df = df.astype(str)
    return df


def read_aop_file(file_path):
    df_aop_ke = pd.read_excel(
        file_path,
        usecols=["Prec.Tox code", "AOP_id", "Key Event"],
        sheet_name="Key Event"
    ).rename(columns={"Key Event": "AOP_title", "Prec.Tox code": "ptx_code"})
    df_aop_ke["Type"] = "KE"

    df_aop_mie = pd.read_excel(
        file_path,
        usecols=["Prec.Tox code", "AOP_id", "Molecular Initiating Event"],
        sheet_name="Molecular Initiating Event"
    ).rename(columns={"Molecular Initiating Event": "AOP_title", "Prec.Tox code": "ptx_code"})
    df_aop_mie["Type"] = "MIE"

    # Fill missing values with "NA"
    df_aop_ke.fillna("NA", inplace=True)
    df_aop_mie.fillna("NA", inplace=True)

    # Concatenate the two DataFrames
    df_aop = pd.concat([df_aop_ke, df_aop_mie], ignore_index=True)

    # Split the "AOP_title" column into two columns using regex and expand with n=1
    split_columns = df_aop['AOP_title'].str.split('leads to', n=1, expand=True)

    # Handle cases where the split might not result in two parts
    df_aop['trigger'] = split_columns[0].str.strip()
    df_aop['AOP_title'] = split_columns[1].str.strip() if 1 in split_columns else ""

    return df_aop


def add_chemical_elements(df, restrict_to=None, json_elements=None):
    if restrict_to is None:
        restrict_to = []
    if json_elements is None:
        json_elements = []

    for index, row in df.iterrows():
        if len(restrict_to) > 0 and row["ptx_code"] not in restrict_to:
            continue

        node = {
            "group": "nodes",
            "data": {
                "role": "chem",
                "id": row["ptx_code"],
                "ptx_code": row["ptx_code"],
                "name": row["chem_name_user"],
                "label": truncate_label(row["label"], 25),
                "cas": row["CASRN"],
                "dtxsid": row["DTXSID"],
                "db_id": row["drugbank_id"],
                "smiles": row["SMILES"],
                "inchi": row["INCHIKEY"]
            }
        }
        for col in [col for col in row.keys() if col not in ["ptx_code", "chem_name_user", "label",
                                                  "drugbank_id", "CASRN", "DTXSID", "SMILES", "INCHIKEY"]]:
            node["data"][col] = row[col]

        json_elements.append(node)

        node = {
            "group": "nodes",
            "data": {
                "role": "prop",
                "id": row["ptx_code"]+"_mw",
                "label": "Molecular Weight",
                "value": row["mw_g_mol"],
                "color": "#009FBD"
            }
        }
        json_elements.append(node)
        edge = {
            "group": "edges",
            "data": {
                "source": row["ptx_code"],
                "target": row["ptx_code"]+"_mw",
                "color": "#009FBD"
            }
        }
        json_elements.append(edge)

    return json_elements


def create_zoom_network(df_chemlist,  output_file):
    test_set = ["PTX062"]# "PTX103"]
    json_ele = add_chemical_elements(df_chemlist, restrict_to=test_set, json_elements=[])
    id_dict = {}

    attributes = ["Chemical Properties", "DrugBank", "AOP", "Enriched Pathways", "Exposome"]
    color = ["#009FBD", "#dd009c", "#FFC300", "#FF5733", "#900C3F"]
    nodes = []
    edges = []
    for ele in json_ele:
        for attr, col in zip(attributes, color):
            nodes.append(
                {
                    "group": "nodes",
                    "data": {
                        "role": "attributes",
                        "id": attr+"_"+ele["data"]["id"],
                        "label": attr,
                        "color": col
                    }
                }
            )
            edges.append(
                {
                    "group": "edges",
                    "data": {
                        "source": ele["data"]["id"],
                        "target": attr+"_"+ele["data"]["id"],
                        "color": col
                    }
                }
            )
    json_ele.extend(nodes)
    json_ele.extend(edges)

    with open(output_file, 'wt') as out:
        json.dump(json_ele, out, indent=6)

    return json_ele


def create_single_chemical_network(df_chemlist, df_drugbank, output_file):
    test_set = ["PTX062"]# "PTX103"]
    json_ele = add_chemical_elements(df_chemlist, restrict_to=test_set, json_elements=[])
    id_dict = {}

    for index, row in df_drugbank.iterrows():
        if row["ptx_code"] not in test_set:
            continue
        if row["drugbank_id"] not in id_dict:
            id_dict[row["drugbank_id"]] = 1
        else:
            id_dict[row["drugbank_id"]] += 1
        json_ele.append(
            {
                "group": "nodes",
                "data": {
                    "role": "drugbank",
                    "id": row["drugbank_id"]+"_"+str(id_dict[row["drugbank_id"]]),
                    "drugbank_id": row["drugbank_id"],
                    "organism": row["organism"],
                    "chem_target": row["Chemical Target"],
                    "chem_effect": row["Chemical Effect at Target"],
                    "known_action": row["known_action"],
                    "toxicity": row["toxicity"]
                }
            }
        )
        json_ele.append(
            {
                "group": "edges",
                "data": {
                    "role": "drugbank",
                    "source": row["ptx_code"],
                    "target": row["drugbank_id"] + "_" + str(id_dict[row["drugbank_id"]]),
                    "chem_effect": row["Chemical Effect at Target"],

                }
            }
        )

    with open(output_file, 'wt') as out:
        json.dump(json_ele, out, indent=6)

    return json_ele


# data files
chem_ide_file = "Manuscript Chemicals - Identifiers.xlsx"
aop_file = "Manuscript Chemicals - AOP.xlsx"
drugbank_file = "Manuscript Chemicals - DrugBank.xlsx"
toxclass_file = "otox.txt.gz"
use_file = "Manuscript Chemicals - Identifiers_with_category.xlsx"
properties_file = "Visulaization P-Chem Dataset ver1.xlsx"

# output files
basic_network_out = "../app/static/elements/basic.json"
aop_network_out = "../app/static/elements/aop.json"
zoom_network_out = "../app/static/elements/zoom.json"
single_network_out = "../app/static/elements/single.json"
chemical_table = "../app/static/data/chemical_table.csv"

palette_1 = ["#6C946F", "#F4D35E", "#EE964B", "#F95738", "#D81159", "#8F2D56", "#218380", "#FFC857"]
palette_2 = ["#894b5d", "#6868ac", "#85a1ac", "#8a5796", "#ecc371", "#f53151"]


# Read DrugBank file
df_drugb = read_drugbank_file(drugbank_file)

# Read properties file
df_prop = read_properties_file(properties_file)

# Read Identifiers file
df_ide = pd.read_excel(
    chem_ide_file,
    usecols="A:F",
    skiprows=0,
    index_col=None,
).rename(columns={"Prec.Tox code": "ptx_code", "PREFERRED_NAME": "chem_name"})
df_ide = df_ide.merge(
        df_drugb[["ptx_code", "drugbank_id"]].drop_duplicates(),
        on=["ptx_code"],
        how="left"
)
df_ide = df_ide.merge(
    df_prop,
    on=["ptx_code"],
    how="left"
)
df_ide = df_ide.fillna("NA")
df_ide["label"] = df_ide["ptx_code"] + " | " + df_ide["chem_name_user"]
all_ptx_codes = df_ide["ptx_code"].unique().tolist()


# Read AOP file
# df_aop = read_aop_file(aop_file)
# aop_dict = df_aop.set_index("AOP_id").apply(
#             lambda row: {"title": row["AOP_title"], "type": row["Type"]}, axis=1
#             ).to_dict()

# Read Toxicity class file
df_toxclass = pd.read_csv(toxclass_file, sep="\t", header=None,
                          names=["chem_name", "tox_class", "score", "n_refs", "ref_list"])
df_toxclass["chem_name"] = df_toxclass["chem_name"].str.replace("_", " ")
### WARNING: not all chem_name in df_toxclass can be matched. Check manually
df_toxclass = df_toxclass.merge(
        df_ide[["ptx_code", "chem_name"]],
        on=["chem_name"],
        how="left"
)
# Keep entries where ptx_code is also present in df_ide
# print(len(df_toxclass))
# df_toxclass.to_csv("toxclass_test1.csv", index=False)
# print( df_toxclass[~df_toxclass["ptx_code"].isin(all_ptx_codes)] )
# df_toxclass = df_toxclass[df_toxclass["ptx_code"].isin(all_ptx_codes)]
# print(len(df_toxclass))
# df_toxclass.to_csv("toxclass_test2.csv", index=False)
# sys.exit()

# Keep only toxicity with highest number of references per chemical
idx = df_toxclass.groupby('chem_name')['n_refs'].idxmax()
df_toxclass = df_toxclass.loc[idx]
df_toxclass = df_toxclass.reset_index(drop=True)
df_toxclass.to_csv("toxclass.csv", index=False)

# Read 'Use' class file
df_useclass = pd.read_excel(
    use_file,
    usecols="A,G",
    skiprows=0,
    index_col=None,
).rename(columns={"Prec.Tox code": "ptx_code", "Category": "use_class"})


### Create network elements
## Create Chemical network elements
chem_elements = add_chemical_elements(df_ide)
tox_classes = df_toxclass["tox_class"].unique()
use_classes = df_useclass["use_class"].unique()

edges = []
color_dic = {}

for categories, cat_name, df, palette in zip(
        [tox_classes, use_classes], ["tox_class", "use_class"], [df_toxclass, df_useclass],
        [palette_1, palette_2]):
    for cat, color in zip(categories, palette):
        color_dic[cat] = color
        chem_elements.append(
            {
                "group": "nodes",
                "data": {
                        "role": "category_"+cat_name,
                    "id": cat,
                    "color": color
                }
            }
        )

    for index, row in df[df["ptx_code"].notna()].iterrows():
        if cat_name == "tox_class":
            if row["n_refs"] < 3:
                continue
            edges.append(
                {
                    "group": "edges",
                    "data": {
                        "id": row["ptx_code"]+"_"+row[cat_name],
                        "role": cat_name,
                        "source": row["ptx_code"],
                        "target": row[cat_name],
                        "color": color_dic[row[cat_name]],
                        "score": row["score"],
                        "n_refs": row["n_refs"],
                        "ref_list": row["ref_list"]
                    }
                }
            )
        else:
            edges.append(
                {
                    "group": "edges",
                    "data": {
                        "id": row["ptx_code"] + "_" + row[cat_name],
                        "role": cat_name,
                        "source": row["ptx_code"],
                        "target": row[cat_name],
                        "color": color_dic[row[cat_name]]
                    }
                }
            )

chem_elements.extend(edges)

# with open("see", "wt") as out:
#     for d in chem_elements:
#         for k,v in d.items():
#             out.write(f"{k}: {str(v)}\n")

with open(basic_network_out, 'wt') as file_out:
    json.dump(chem_elements, file_out, indent=6)
print(f"{basic_network_out} was generated")

df_ide = df_ide.replace("NA", "'NA'")
df_ide = df_ide.rename(columns={
    "chem_name": "Compound name",
    "chem_name_user": "Compound name (user)",
    "drugbank_id": "DrugBank ID",
    "ptx_code": "Ptox code",
})
cols_to_print = ["Ptox code", "Compound name (user)", "Compound name", "DrugBank ID", "CASRN", "DTXSID", "SMILES", "INCHIKEY"]
cols = [col for col in df_ide.columns if col not in cols_to_print and col != "label"]
cols_to_print += cols
df_ide.to_csv(chemical_table, columns=cols_to_print, index=False)
print(f"{chemical_table} was generated")

sys.exit()


## Zoom view 1
create_zoom_network(df_ide, zoom_network_out)


## Create Individual Chemical view networks
create_single_chemical_network(df_ide, df_drugb, single_network_out)

sys.exit()


aop_elements = []
for aop_id in aop_dict:
    aop_elements.append(
        {
            "group": "nodes",
            "data": {
                "role": "aop-"+aop_dict[aop_id]["type"].lower(),
                "id": "AOP:"+str(aop_id),
                "aop_id": str(aop_id),
                "aop_title": aop_dict[aop_id]["title"],
                "aop_type": aop_dict[aop_id]["type"],
                "label": truncate_label(aop_dict[aop_id]["title"], 25)
            }
        }
    )

for index, row in df_ide.iterrows():
    if row["ptx_code"] in df_aop["ptx_code"].unique():
        aop_elements.append(
            {
                "group": "nodes",
                "data": {
                    "role": "chem",
                    "id": row["ptx_code"],
                    "ptx_code": row["ptx_code"],
                    "name": row["chem_name"],
                    "label": truncate_label(row["label"], 25),
                    "cas": row["CASRN"],
                    "dtxsid": row["DTXSID"],
                    "db_id": row["drugbank_id"],
                    "smiles": row["SMILES"],
                    "inchi": row["INCHIKEY"]
                }
            }
        )

for index, row in df_aop.iterrows():
    aop_elements.append(
        {
            "group": "edges",
            "data": {
                "source": row["ptx_code"],
                "target": "AOP:"+str(row["AOP_id"]),
                "trigger": row["trigger"],
                "type": row["Type"]
            }
        }
    )


with open(aop_network_out, 'wt') as file_out:
    json.dump(aop_elements, file_out, indent=6)
