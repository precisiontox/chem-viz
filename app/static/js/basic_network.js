let cy_basic;
let cose_layout =
    {
    name: 'cose',
    fit: true,
    nodeOverlap: 500
};

function reLayout(network) {
    let layout = network.layout(cose_layout);
    layout.run();
}

function initializeNetworkBasic() {
    if (!document.getElementById('cy_basic').hasChildNodes()) {
        fetch(jsonBasic)
            .then(response => response.json())
            .then(elements => {
                cy_basic = cytoscape({ // Set cy_basic globally
                    container: document.getElementById('cy_basic'), // container to render in
                    elements: elements,
                    style: [ // the stylesheet for the graph
                        {
                            selector: "node",
                            style: {
                                "border-width": "0.5px",
                                "border-color": "#2C2C2C",
                                "border-opacity": "1"
                            }
                        },
                        {
                            selector: "node.hl",
                            style: {
                                "font-size": "25px",
                                "font-weight": "bold",
                                "border-width": "5px",
                                "border-color": "#B43F3F",
                            }
                        },
                        {
                            selector: "node.hl2",
                            style: {
                                "border-width": "5px",
                                "border-color": "#B43F3F",
                            }
                        },
                        {
                            selector: "node[role^='category']",
                            style: {
                                "shape": "diamond",
                                "width": "80px",
                                "height": "80px",
                                "background-color": "data(color)",
                                "font-size": "25px",
                                "font-weight": "bold",
                                "label": "data(id)",
                                "color": "white",
                                "text-outline-width": "3px",
                                "text-outline-color": "data(color)",
                                "text-halign": "center",
			                    "text-valign": "center",
                            }
                        },
                        {
                            selector: "node[role='chem']",
                            style: {
                                "shape": "ellipse",
                                "background-color": "#ccc",
                                "width": "40px",
                                "height": "40px",
                                "label": "data(ptx_code)"
                            }
                        },
                        {
                            selector: "node[role='chem'].hl, node[role='chem']:selected",
                            style: {
                                "background-color": "#3c5d51",
                            }
                        },
                        {
                            selector: "node[role^='category'].hl, node[role^='category']:selected",
                            style: {
                                "text-outline-color": "#B43F3F"
                            }
                        },
                        {
                            selector: "edge",
                            style: {
                                "line-color": "data(color)"
                            }
                        },
                        {
                            selector: "edge[role='tox_class']",
                            style: {
                                "width": "mapData(score, -4, 10, 1, 10)",
                            }
                        },
                        {
                            selector: "edge.hl, edge:selected",
                            style: {
                                "line-color": "#B43F3F",
                                "z-index": "1"
                            }
                        }
                    ],
                    layout: cose_layout
                });

                // Add mouseover and mouseout events
                cy_basic.on('mouseover mouseout', 'node', function (event) {
                    var node = event.target;
                    node.toggleClass("hl");
                    node.connectedEdges().toggleClass("hl");
                    node.neighborhood().toggleClass("hl2");
                });

                cy_basic.on('mouseover mouseout', 'edge', function (event) {
                    var node = event.target;
                    node.toggleClass("hl");
                });

                cy_basic.nodes("node[role='chem']").qtip({
                    content: function () {
                        if (this.data("db_id")==="NA") {
                            var drugbank = "<b class='field drugbank_id'>DrugBank AN</b> | N/A<br>\n";
                        } else {
                            var drugbank = "<b class='field drugbank_id'>DrugBank AN</b> | <a href='https://go.drugbank.com/drugs/" + this.data("db_id") + "'>" + this.data("db_id") + "</a><br>\n";
                        }
                        if (this.data("mw_g_mol")==="NA") {
                            var mw = "<b class='field prop'>Molecular Weight</b> | N/A<br>\n";
                        } else {
                            var mw = "<b class='field prop'>Molecular Weight</b> | "+this.data("mw_g_mol")+" g/mol<br>\n"
                        }
                        if (this.data("solubility_h2o_mol_liter")==="NA") {
                            var solubility = "<b class='field prop'>Solubility (H2O)</b> | N/A<br>\n";
                        } else {
                            var solubility = "<b class='field prop'>Solubility (H2O)</b> | "+this.data("solubility_h2o_mol_liter")+" mol/liter (source:"+this.data("source_solubility_h2o")+")<br>\n"
                        }
                        if (this.data("henry_coefficient_atm_m3_mol")==="NA") {
                            var henry = "<b class='field prop'>Henry Coefficient</b> | N/A<br>\n";
                        } else {
                            var henry = "<b class='field prop'>Henry Coefficient</b> | "+this.data("henry_coefficient_atm_m3_mol")+" atm*m3/mol (source:"+this.data("source_henry")+")<br>\n"
                        }
                        if (this.data("log_kaw_kh_rt")==="NA") {
                            var log_kaw = "<b class='field prop'>Log Kaw</b> | N/A<br>\n";
                        } else {
                            var log_kaw = "<b class='field prop'>Log Kaw</b> | "+this.data("log_kaw_kh_rt")+" (source: "+this.data("source_kaw")+")<br>\n"
                        }
                        if (this.data("log_kow_liter_liter")==="NA") {
                            var log_kow = "<b class='field prop'>Log Kow</b> | N/A<br>\n";
                        } else {
                            var log_kow = "<b class='field prop'>Log Kow</b> | "+this.data("log_kow_liter_liter")+" (source: "+this.data("source_kow")+")<br>\n"
                        }
                        if (this.data("pka_acid")==="NA") {
                            var pka_acid = "<b class='field prop'>pKa (acid)</b> | N/A<br>\n";
                        } else {
                            var pka_acid = "<b class='field prop'>pKa (acid)</b> | "+this.data("pka_acid")+" (source: "+this.data("source_pka")+")<br>\n"
                        }
                        if (this.data("pka_base")==="NA") {
                            var pka_base = "<b class='field prop'>pKa (base)</b> | N/A<br>\n";
                        } else {
                            var pka_base = "<b class='field prop'>pKa (base)</b> | "+this.data("pka_base")+" (source: "+this.data("source_pka")+")<br>\n"
                        }
                        if (this.data("log_dlipw_ph74_liter_liter")==="NA") {
                            var dlipw = "<b class='field prop'>Log Dlipw (pH 7.4)</b> | N/A<br>\n";
                        } else {
                            var dlipw = "<b class='field prop'>Log Dlipw (pH 7.4)</b> | "+this.data("log_dlipw_ph74_liter_liter")+" (source: "+this.data("source_dlipw")+")<br>\n"
                        }
                        if (this.data("freely_dissolved_fraction")==="NA") {
                            var fdf = "<b class='field prop'>Freely Dissolved Fraction</b> | N/A<br>\n";
                        } else {
                            var fdf = "<b class='field prop'>Freely Dissolved Fraction</b> | "+this.data("freely_dissolved_fraction")+"<br>\n"
                        }
                        if (this.data("density_kg_liter")==="NA") {
                            var density = "<b class='field prop'>Density</b> | N/A<br>\n";
                        } else {
                            var density = "<b class='field prop'>Density</b> | "+this.data("density_kg_liter")+" kg/liter (source:"+this.data("source_density")+")<br>\n"
                        }
                        var qtip_content =
                            "<div class='qtip-content' style='max-height: 200px; overflow-y: auto;'>" +
                            "<b class='field compound'>Compound</b><b>  | " + this.data("name") + "</b> <br>\n" +
                            "<b class='field ptx_code'>PTX Code</b> | " + this.data("ptx_code") + "<br>\n" +
                            "<b class='field cas_number'>CAS Number</b> | " + this.data("cas") + "<br>\n" +
                            "<b class='field dsstox_id'>DSSTox ID</b> | <a href='https://comptox.epa.gov/chemexpo/chemical/"+this.data("dtxsid")+"'>"+this.data("dtxsid") + "</a><br>\n" +
                             drugbank+
                            "<b class='field smiles'>SMILES</b> | " + this.data("smiles") + "<br>\n" +
                            "<b class='field inchi'>InChIKey</b> | " + this.data("inchi") + "<br>\n" +
                            mw + solubility + henry + log_kaw + log_kow + pka_acid + pka_base + dlipw + fdf + density +
                            "</div>";
                        return qtip_content
                    },
                    position: {
                        my: "top center",
                        at: "bottom center"
                    },
                    style: {
                        classes: "qtip-bootstrap qtip-wide",
                        tip: {
                            width: 50,
                            height: 10
                        }
                    },
                    show: {
                        event: "click"
                    },
                    hide: {
                        event: 'unfocus'
                    }
                });

                cy_basic.nodes("node[role^='category']").qtip({
                    content: function () {
                        if (this.data("role") === "category_tox_class" ) {
                            var category = "\"Toxicity\"";
                        } else if (this.data("role") === "category_use_class") {
                            var category = "\"Use\"";
                        }
                        var qtip_content =
                            "<div class='qtip-content'>" +
                            "<b style='color:"+this.data("color")+"'>"+this.data("id")+"</b><br>\n" +
                            "Category: "+category+"<br>\n" +
                            "</div>";
                        return qtip_content
                    },
                    position: {
                        my: "top center",
                        at: "bottom center"
                    },
                    style: {
                        classes: "qtip-bootstrap qtip-wide",
                        tip: {
                            width: 20,
                            height: 10
                        }
                    },
                    show: {
                        event: "click"
                    },
                    hide: {
                        event: 'unfocus'
                    }
                });

                cy_basic.edges().qtip({
                    content: function () {
                        if (this.data("role") === "tox_class") {
                            var qtip_content =
                                "<div class='qtip-content'><br>\n" +
                                "<b class='field'>Compound</b> | " + this.data("source") + "<br>\n" +
                                "<b class='field'>Toxicity class</b> | <span style='color:" + this.data("color") + "'>" + this.data("target") + "</span><br>\n" +
                                "<b class='field'>Score</b> | " + this.data("score") + "<br>\n" +
                                "<b class='field'># references</b> | " + this.data("n_refs") + "<br>\n" +
                                "</div>";
                        } else if (this.data("role") === "use_class") {
                            var qtip_content =
                                "<div class='qtip-content'><br>\n" +
                                "<b class='field'>Compound</b> | " + this.data("source") + "<br>\n" +
                                "<b class='field'>Use class</b> | <span style='color:" + this.data("color") + "'>" + this.data("target") + "</span><br>\n" +
                                "</div>";
                        }
                        return qtip_content
                    },
                    position: {
                        my: "top center",
                        at: "bottom center"
                    },
                    style: {
                        classes: "qtip-bootstrap qtip-wide",
                        tip: {
                            width: 20,
                            height: 10
                        }
                    },
                    show: {
                        event: "click"
                    },
                    hide: {
                        event: 'unfocus'
                    }
                });

                // Populate dropdown with chemical nodes
                const chemNodes = cy_basic.nodes("[role='chem']");
                const select = document.getElementById('chem-node-select');
                chemNodes.forEach(node => {
                    const option = document.createElement('option');
                    option.value = node.id();
                    option.textContent = node.data('label') || node.id();
                    select.appendChild(option);
                });

                selectClassification();

            })
            .catch(error => console.error('Error loading elements:', error));
    }

}

function filterNetworkByChemNode() {
    let selectedNodeId = document.getElementById('chem-node-select').value;
    if (!selectedNodeId) {
        // If no node is selected, reset the network
        cy_basic.elements().show();
        cy_basic.fit();
        return;
    }

    // Get the selected node
    let selectedNode = cy_basic.getElementById(selectedNodeId);

    if (selectedNode.length === 0) {
        console.error("Selected node not found:", selectedNodeId);
        return;
    }

    // Get the connected edges and neighbor nodes
    let connectedEdges = selectedNode.connectedEdges();
    let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());

    // Hide non-displayed elements
    cy_basic.elements().hide();
    selectedNode.show();
    connectedEdges.show();
    neighborNodes.show();

    // Fit the view to the selected node and its connections
    reLayout(selectedNode.union(connectedEdges).union(neighborNodes));
    cy_basic.fit(selectedNode.union(connectedEdges).union(neighborNodes));
}

function changeChemNodeLabel(){
    let selectedLabel = document.getElementById('chem-node-label-select').value;
    let selectedLabel2 = 'data(' + selectedLabel + ')';
    cy_basic.style().selector('node[role="chem"]').style('label', selectedLabel2).update();
}

function selectClassification()  {
    let selectedClass = document.getElementById('category-select').value;
    let selectedNodes = cy_basic.nodes("[role^='category_" + selectedClass + "']");

    // Get the connected edges and neighbor nodes
    let connectedEdges = selectedNodes.connectedEdges();
    let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());

    // Hide non-displayed elements
    cy_basic.elements().hide();
    selectedNodes.show();
    connectedEdges.show();
    neighborNodes.show();

    // Re-layout and fit view
    reLayout(selectedNodes.union(connectedEdges).union(neighborNodes));
    cy_basic.fit(selectedNodes.union(connectedEdges).union(neighborNodes));
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablinks').click();
});
