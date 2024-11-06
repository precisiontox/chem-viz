import sys
import json
import pandas as pd


def truncate_label(label, length=25):
    if len(label) > 25:
        return label[:25]+"..."
    else:
        return label


def wrap_label(label, length=10):
    line_len = 0
    wrapped_label = ""
    for word in label.split(" "):
        if line_len == 0:
            wrapped_label = word
        elif line_len <= length:
            wrapped_label += " " + word
        else:
            wrapped_label += "\n" + word    
            line_len = 0
        line_len += len(word)
    return wrapped_label


def format_float(value):
    try:
        return f"{float(value):.4f}"
    except:
        return value


def read_identifier_file(file_path):
    df = pd.read_excel(
        file_path,
        usecols="A:F",
        skiprows=0,
        index_col=None,
    ).rename(columns={"Prec.Tox code": "ptx_code", "PREFERRED_NAME": "chem_name"})
    df["label"] = df["ptx_code"] + " | " + df["chem_name"]
    df = df[df["chem_name"].notna()]
    return df


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


def read_useclass_file(file_path):
    df = pd.read_excel(
        file_path,
        usecols="A,G",
        skiprows=0,
        index_col=None,
    ).rename(columns={"Prec.Tox code": "ptx_code", "Category": "use_class"})
    return df


def read_toxclass_file(file_path, df_identifier):
    df = pd.read_csv(
        file_path,
        sep="\t", 
    )
    df = df[df["ptx_code"].isin(df_identifier["ptx_code"].unique())]
    return df


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
    properties = [col for col in df.columns if col not in ["ptx_code", "chem_name_user"]]
    return df, properties


def read_baseline_tox_file(file_path):
    df = pd.read_excel(
        file_path,
        skiprows=0,
        index_col=None,
    ).rename(columns={
        "Baseline - Daphina": "Baseline - Daphnia"
    })
    df = df.drop(columns=["Compound", "CASRN", "DTXSID"], axis=1)
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


def read_drugbank_moa_file(file_path):
    df_moa = pd.read_excel(
        file_path,
        skiprows=0,
        index_col=None,
        sheet_name="MoA",
        usecols=["Prec.Tox code", "mechanism_of_action"]
    ).rename(columns={
        "Prec.Tox code": "ptx_code",
        "mechanism_of_action": "moa_drugbank"
    })
    df_moa = df_moa[df_moa["moa_drugbank"].notna()]

    df_bind = pd.read_excel(
        file_path,
        skiprows=0,
        index_col=None,
        sheet_name="Target",
        usecols=["Prec.Tox code", "protein_binding"]
    ).rename(columns={
        "Prec.Tox code": "ptx_code",
    })
    df_bind = df_bind[df_bind["protein_binding"].notna()]

    df = df_moa.merge(
        df_bind,
        on=["ptx_code"],
        how="outer"
    )

    return df


def read_t3db_moa_file(file_path):
    df_moa = pd.read_excel(
        file_path,
        skiprows=0,
        index_col=None,
        sheet_name="MoA",
        usecols=["Prec.Tox code", "Mechanism of Action"]
    ).rename(columns={
        "Prec.Tox code": "ptx_code",
        "Mechanism of Action": "moa_t3db"
    })
    df_moa = df_moa[df_moa["moa_t3db"].notna()]
    df_moa = df_moa.drop_duplicates()

    df_target = pd.read_excel(
        file_path,
        skiprows=0,
        index_col=None,
        sheet_name="Target",
        usecols=["Prec.Tox code", "Target Name"]
    ).rename(columns={
        "Prec.Tox code": "ptx_code",
        "Target Name": "target_t3db"
    })
    df_target = df_target[df_target["target_t3db"].notna()]
    df_target = df_target.drop_duplicates()

    return df_moa, df_target


def get_chemical_node(chem_values: dict): 
    chem_node = {
        "group": "nodes",
        "data": {
            "role": "chem",
            "id": chem_values["ptx_code"],
            "ptx_code": chem_values["ptx_code"],
            "name": chem_values["chem_name_user"],
            "label": chem_values["label"],# truncate_label(chem_values["label"], 25),
            "cas": chem_values["CASRN"],
            "dtxsid": chem_values["DTXSID"],
            "db_id": chem_values["drugbank_id"],
            "smiles": chem_values["SMILES"],
            "inchi": chem_values["INCHIKEY"]
        }
    }
    
    for col in property_cols:
        chem_node["data"][col] = chem_values[col]  

    return chem_node


def create_general_network(
    df_chem: pd.DataFrame, df_tox: pd.DataFrame, df_use: pd.DataFrame, outf:str
    ):

    json_elements = []

    for index, row in df_chem.iterrows():
        json_elements.append(get_chemical_node(row))


    tox_classes = df_tox["tox_class"].unique()
    use_classes = df_use["use_class"].unique()
    color_dic = {}
    for categories, cat_name, df, palette in zip(
            [tox_classes, use_classes], 
            ["tox_class", "use_class"], 
            [df_tox, df_use],
            [palette_1, palette_2]
        ):
        for cat, color in zip(categories, palette):
            color_dic[cat] = color
            json_elements.append(
                {
                    "group": "nodes",
                    "data": {
                            "role": "category_"+cat_name,
                        "id": cat,
                        "label": wrap_label(cat, 10),
                        "color": color
                    }
                }
            )

        for index, row in df[df["ptx_code"].notna()].iterrows():
            if cat_name == "tox_class":
                if row["n_refs"] < 3:
                    continue
                json_elements.append(
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
                json_elements.append(
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

    # Create output files
    # Export basic network elements
    with open(outf, 'wt') as file_out:
        json.dump(json_elements, file_out, indent=6)


def get_attribute_nodes_edges(chem_values: dict):
    attributes = ["Physico-chemical properties", "Use", "Toxicity", 
                 "Baseline Toxicity", "Mechanism of Action", "Targets"]
    shapes = ["round-diamond", "round-rectangle", "round-pentagon", 
             "round-hexagon", "round-heptagon", "round-tag"]
    network_elements = []
    for attr, shape in zip(attributes, shapes):
        label = attr
        label = wrap_label(attr, 10)
        attr_node = {
            "group": "nodes",
            "data": {
                "role": "attribute",
                "id": attr,
                "label": label,
                "colorBorder": colors[attr+"_border"],
                "colorBg": colors[attr+"_bg"],
                "shape": shape
            }
        }
        attr_edge = {
            "group": "edges",
            "data": {
                "role": "attribute",
                "source": chem_values["ptx_code"],
                "target": attr
            }
        }
        network_elements.append(attr_node)
        network_elements.append(attr_edge)
    return network_elements


def get_phychem_property_nodes_edges(chem_values: dict):
    nodes = []
    edges = []
    not_empty = False
    for prop in [col for col in property_cols if "source" not in col]:
        label = labels[prop] if prop in labels else prop
        unit = units[prop] if prop in units else ""
        source = chem_values[sources[prop]] if prop in sources else ""
        if str(chem_values[prop]) == "NA":
            combined_label = label+":\nn/a"
            color_bg = "#ddd"
            color_border = "#9a999a"
        else:
            combined_label = label+":\n"+str(chem_values[prop])+" "+unit
            color_bg = colors["Physico-chemical properties_bg"]
            color_border = colors["Physico-chemical properties_border"]
            not_empty = True
        hl_label = combined_label
        if source != "":
            hl_label = combined_label+"\nSource: "+source
        prop_node = {
            "group": "nodes",
            "data": {
                "role": "prop",
                "id": prop,
                "label": label,
                "combinedLabel": combined_label,
                "value": chem_values[prop],
                "hlLabel": hl_label,
                "colorBg": color_bg,
                "colorBorder": color_border
            }
        }
        prop_edge = {
            "group": "edges",
            "data": {
                "role": "prop",
                "subrole": "attribute",
                "source": "Physico-chemical properties",
                "target": prop,
                "color": color_border
            }
        }
        nodes.append(prop_node)
        edges.append(prop_edge)
    if not_empty:
        return nodes + edges
    else:
        return []


def get_baseline_tox_nodes_edges(chem_values: dict):
    base_nodes = []
    base_edges = []
    base_not_empty = False
    for base in [col for col in chem_values.keys() if "aseline" in col]:
        if str(chem_values[base]) == "NA":
            label = labels[base].replace("Baseline Toxicity - ","")+":\nn/a"
            color_bg = "#ddd"
            color_border = "#9a999a"
        else:
            label = labels[base].replace("Baseline Toxicity - ","")+":\n"+str(chem_values[base])
            color_bg = colors["Baseline Toxicity_bg"]
            color_border = colors["Baseline Toxicity_border"]
            base_not_empty = True
        base_node = {
            "group": "nodes",
            "data": {
                "role": "base_tox",
                "id": base,
                "label": label,
                "value": chem_values[base],
                "colorBg": color_bg,
                "colorBorder": color_border
            }
        }
        base_edge = {
            "group": "edges",
            "data": {
                "role": "base_tox",
                "subrole": "attribute",
                "source": "Baseline Toxicity",
                "target": base,
                "color": color_border
            }
        }
        base_nodes.append(base_node)
        base_edges.append(base_edge)
    if base_not_empty:
        return base_nodes + base_edges
    else:
        return []


def get_mechanism_of_action_nodes_edges(chem_values: dict):
    moa_nodes = []
    moa_edges = []
    moa_not_empty = False
    for moa_col in [col for col in chem_values.keys() if "moa_" in col]:
        if str(chem_values[moa_col]) == "NA":
            label = labels[moa_col].replace("Mechanism of Action (","").replace(")","")+":\nn/a"
            color_bg = "#ddd"
            color_border = "#9a999a"
        else:
            label = labels[moa_col].replace("Mechanism of Action (","").replace(")","")+":\n"+str(chem_values[moa_col])
            color_bg = colors["Mechanism of Action_bg"]
            color_border = colors["Mechanism of Action_border"]
            moa_not_empty = True
        full_label = wrap_label(label, 20)
        label = truncate_label(label)
        label = wrap_label(label, 10)
        moa_node = {
            "group": "nodes",
            "data": {
                "role": "moa",
                "id": moa_col,
                "label": label,
                "fullLabel": full_label,
                "value": chem_values[moa_col],
                "colorBg": color_bg,
                "colorBorder": color_border
            }
        }
        moa_edge = {
            "group": "edges",
            "data": {
                "role": "moa",
                "subrole": "attribute",
                "source": "Mechanism of Action",
                "target": moa_col,
                "color": color_border
            }
        }
        moa_nodes.append(moa_node)
        moa_edges.append(moa_edge)
    if moa_not_empty:
        return moa_nodes + moa_edges
    else:
        return []


def get_use_class_nodes_edges(df_use):
    use_nodes = []
    use_edges = []
    
    for index, row in df_use.iterrows():
        use_node = {
            "group": "nodes",
            "data": {
                "role": "category_use_class",
                "id": row["use_class"],
                "label": wrap_label(row["use_class"], 10),
                "colorBg": colors["Use_bg"],
                "colorBorder": colors["Use_border"]
            }
        }            
        use_edge = {
            "group": "edges",
            "data": {
                "role": "category_use_class",
                "subrole": "attribute",
                "source": "Use",
                "target": row["use_class"],
                "color": colors["Use_border"]
            }
        }
        use_nodes.append(use_node)
        use_edges.append(use_edge)
    return use_nodes + use_edges


def get_toxicity_class_nodes_edges(df_tox):
    tox_nodes = []
    tox_edges = []
    for index, row in df_tox.iterrows():
        tox_node = {
            "group": "nodes",
            "data": {
                "role": "category_tox_class",
                "id": row["tox_class"],
                "label": wrap_label(row["tox_class"], 10),
                "colorBg": colors["Toxicity_bg"],
                "colorBorder": colors["Toxicity_border"]
            }
        }
        tox_edge = {
            "group": "edges",
            "data": {
                "role": "category_tox_class",
                "subrole": "attribute",
                "source": "Toxicity",
                "target": row["tox_class"],
                "color": colors["Toxicity_border"],
                "score": row["score"],
                "n_refs": row["n_refs"],
                "ref_list": row["ref_list"]
            }
        }
        tox_nodes.append(tox_node)
        tox_edges.append(tox_edge)
    return tox_nodes + tox_edges


def create_single_chemical_network(
    chem_values: dict,  df_tox: pd.DataFrame, df_use: pd.DataFrame, output_file: str
    ):
    """ Create nodes & edges for network containing a single chemical in the 
    center and its properties as nodes around it.
    """
    json_elements = []

    # Start list of network elements with the chemical node
    json_elements.append(get_chemical_node(chem_values))

    # Add attributes main nodes
    json_elements += get_attribute_nodes_edges(chem_values)

    # Add physico-chemical properties nodes and edges
    json_elements += get_phychem_property_nodes_edges(chem_values)

    # Add baseline toxicity nodes and edges
    json_elements += get_baseline_tox_nodes_edges(chem_values)

    # Add mechanism of action nodes and edges
    json_elements += get_mechanism_of_action_nodes_edges(chem_values)

    # Add use & toxicity nodes and edges
    json_elements += get_use_class_nodes_edges(df_use)
    json_elements += get_toxicity_class_nodes_edges(df_tox)

    # Export network elements as JSON
    with open(output_file, 'wt') as out:
        json.dump(json_elements, out, indent=6)

    return


def export_chemical_table(df):
    """ Export chemical table to CSV and JSON files
    """
    df = df.replace("NA", "")
    df = df.rename(columns=labels)
    df = df.drop(columns=["label"], axis=1)
    cols_to_print = ["Ptox code", "Compound name (user)", "Compound name", "DrugBank ID", 
                    "CASRN", "DTXSID", "SMILES", "INCHIKEY"]
    cols_to_print += [col for col in df.columns if col not in cols_to_print]
    df.to_csv(chemical_table, columns=cols_to_print, index=False)
    print(f"{chemical_table} was generated")

    # Replace NaN values in the DataFrame with None, ensuring consistent replacement
    df = df.astype(object).where(pd.notnull(df), None)

    # Convert DataFrame to a list of dictionaries with column order preserved
    data = df.to_dict(orient='records')

    # Convert the list of dictionaries to JSON, ensuring the order is preserved
    json_data = json.dumps(data, indent=2)

    # Optionally, write this JSON data to a file
    with open(chemical_table_json, 'wt') as file_out:
        json.dump(data, file_out, indent=6)
    print(f"{chemical_table_json} was generated")

    return


# data files
chem_ide_file = "Manuscript Chemicals - Identifiers.xlsx"
aop_file = "Manuscript Chemicals - AOP.xlsx"
drugbank_file = "Manuscript Chemicals - DrugBank.xlsx"
toxclass_file = "toxicity_categories.tsv"
use_file = "Manuscript Chemicals - Identifiers_with_category.xlsx"
properties_file = "Visulaization P-Chem Dataset ver1.xlsx"
baseline_file = "Visualization Data - Baseline Toxicity.xlsx"
drugbank_moa_file = "Manuscript Chemicals - DrugBank - Target & MoA.xlsx"
t3db_moa_file = "Manuscript Chemicals - T3Db - Target & MoA.xlsx"

# output files
elements_dir = "../app/static/elements/"
basic_network_out = f"{elements_dir}basic.json"
chemical_table = "../app/static/data/chemical_table.csv"
chemical_table_json = "../app/static/data/chemical_table.json"

palette_1 = ["#6C946F", "#F4D35E", "#EE964B", "#F95738", "#D81159", "#8F2D56", "#218380", "#FFC857"]
palette_2 = ["#894b5d", "#6868ac", "#85a1ac", "#8a5796", "#ecc371", "#f53151"]
labels = {
    "ptx_code": "Ptox code",
    "chem_name": "Compound name",
    "chem_name_user": "Compound name (user)",
    "drugbank_id": "DrugBank ID",
    "use_class": "Use Category",
    "tox_class": "Toxicity Category",
    "mw_g_mol": "Molecular Weight",
    "solubility_h2o_mol_liter": "Solubility (H2O)",
    "source_solubility_h2o": "Solubility (H2O) source",
    "henry_coefficient_atm_m3_mol": "Henry Coefficient",
    "source_henry": "Henry Coefficient source",
    "log_kaw_kh_rt": "Log Kaw",
    "source_kaw": "Log Kaw source",
    "log_kow_liter_liter": "Log Kow",
    "source_kow": "Log Kow source",
    "pka_acid": "pKa (acid)",
    "pka_base": "pKa (base)",
    "source_pka": "pKa source",
    "log_dlipw_ph74_liter_liter": "Log Dlipw (pH 7.4)",
    "source_dlipw": "Log Dlipw source",
    "freely_dissolved_fraction": "Freely Dissolved Fraction",
    "density_kg_liter": "Density",
    "source_density": "Density source",
    "Baseline - C. elegans": "Baseline Toxicity - C. elegans",
    "Baseline - Daphnia": "Baseline Toxicity - D. magna",
    "Baseline - D. rerio": "Baseline Toxicity - D. rerio",
    "Baseline - Xenopus": "Baseline Toxicity - X. laevis",
    "Baseline - Drosophila": "Baseline Toxicity - D. melanogaster",
    "Baseline - Cells": "Baseline Toxicity - HepG2 cells",
    "baseline_cells_generic_micromole_liter_free_ec10": "Baseline Toxicity - HepG2 cells (generic micromol/l free EC10)",
    "moa_drugbank": "Mechanism of Action (DrugBank)",
    "protein_binding": "Protein Binding (DrugBank)",
    "moa_t3db": "Mechanism of Action (T3DB)",
    "target_t3db": "Target Name (T3DB)"
}
units = {
    "mw_g_mol": "g/mol",
    "solubility_h2o_mol_liter": "mol/liter",
    "henry_coefficient_atm_m3_mol": "atm*m3/mol",
    "density_kg_liter": "kg/liter"
}
colors = {
    "Physico-chemical properties_border": "#007cc1",
    "Physico-chemical properties_bg": "#539cc4",
    "Use_border": "#B03052",
    "Use_bg": "#D76C82",
    "Toxicity_border": "#135D66",
    "Toxicity_bg": "#77B0AA",
    "Baseline Toxicity_border": "#AB886D",
    "Baseline Toxicity_bg": "#D6C0B3",
    "Mechanism of Action_border": "#d4ac0d",
    "Mechanism of Action_bg": "#F4D35E",
    "Targets_border": "#6A1E55",
    "Targets_bg": "#A64D79"
}
sources = {
    "solubility_h2o_mol_liter": "source_solubility_h2o",
    "henry_coefficient_atm_m3_mol": "source_henry",
    "log_kaw_kh_rt": "source_kaw",
    "log_kow_liter_liter": "source_kow",
    "pka_acid": "source_pka",
    "pka_base": "source_pka",
    "log_dlipw_ph74_liter_liter": "source_dlipw",
    "density_kg_liter": "source_density"
}


# Read Identifiers file
df_ide = read_identifier_file(chem_ide_file)

# Read DrugBank file
df_drugb = read_drugbank_file(drugbank_file)
df_ide = df_ide.merge(
        df_drugb[["ptx_code", "drugbank_id"]].drop_duplicates(),
        on=["ptx_code"],
        how="left"
)

# Read 'Use' class file
df_useclass = read_useclass_file(use_file)
df_ide = df_ide.merge(
    df_useclass.groupby('ptx_code').agg({'use_class': '; '.join}).reset_index(),
    on=["ptx_code"],
    how="left"
)

# Read Toxicity Class file ### Apply filtering on score/n_refs
df_toxclass = read_toxclass_file(toxclass_file, df_ide)
df_ide = df_ide.merge(
    df_toxclass.groupby('ptx_code').agg({'tox_class': '; '.join}).reset_index(),
    on=["ptx_code"],
    how="left"
)

# Read Physiochemical Properties file
df_prop, property_cols = read_properties_file(properties_file)
df_ide = df_ide.merge(
    df_prop,
    on=["ptx_code"],
    how="left"
)

# Read Baseline Toxicity file
df_base = read_baseline_tox_file(baseline_file)
df_ide = df_ide.merge(
    df_base,
    on=["ptx_code"],
    how="left"
)

# Read Target & MoA file (DrugBank)
df_moa_drugbank = read_drugbank_moa_file(drugbank_moa_file)
df_ide = df_ide.merge(
    df_moa_drugbank,
    on=["ptx_code"],
    how="left"
)

# Read Target & MoA file (T3Db)
df_moa_t3db, df_target_t3db = read_t3db_moa_file(t3db_moa_file)
df_ide = df_ide.merge(
    df_moa_t3db.groupby('ptx_code').agg({'moa_t3db': '; '.join}).reset_index(),
    on=["ptx_code"],
    how="left"
)
df_ide = df_ide.merge(
    df_target_t3db.groupby('ptx_code').agg({'target_t3db': '; '.join}).reset_index(),
    on=["ptx_code"],
    how="left"
)

# Read AOP file
# df_aop = read_aop_file(aop_file)
# aop_dict = df_aop.set_index("AOP_id").apply(
#             lambda row: {"title": row["AOP_title"], "type": row["Type"]}, axis=1
#             ).to_dict()

df_ide = df_ide.fillna("NA")


# Export chemical table
export_chemical_table(df_ide)

### Create network elements
# Create general network
create_general_network(df_ide, df_toxclass, df_useclass, basic_network_out)
print(f"{basic_network_out} was generated")

# Create single chemical networks
for chem in df_ide["ptx_code"].unique():
    create_single_chemical_network(
        df_ide[df_ide["ptx_code"] == chem].iloc[0],
        df_toxclass[df_toxclass["ptx_code"] == chem],
        df_useclass[df_useclass["ptx_code"] == chem],
        elements_dir+"single_chem/"+chem+"_network.json"
    )
print(f"{len(df_ide['ptx_code'].unique())} single chemical networks were generated")
sys.exit()


# Create AOP network
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
