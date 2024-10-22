let cy_basic;
let cose_layout =
    {
    name: 'cose',
    fit: true,
    padding: 20,
    nodeRepulsion: 10000,
    nodeOverlap: 700
};
let initial_layout = {
    name: 'grid', // Use 'circle' or 'grid' for faster initial layout
    fit: true,
    padding: 10,
};
let lastClickTime = 0;  // Store the time of the last click
let doubleClickDelay = 300;  // Maximum delay between clicks (in milliseconds)

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
                            selector: "node[role='category_use_class']",
                            style: {
                                "shape": "round-rectangle"
                            }
                        },
                        {
                                selector: "node[role='category_tox_class']",
                                style: {
                                    "shape": "round-pentagon"
                                }
                        },
                        {
                            selector: "node[role='chem']",
                            style: {
                                "shape": "ellipse",
                                "border-width": "5px",
                                "border-color": "#424949",
                                "background-color": "#ccc",
                                "color": "#333",
                                "width": "40px",
                                "height": "40px",
                                "label": "data(ptx_code)"
                            }
                        },
                        {
                            selector: "node[role='chem'].hl, node[role='chem']:selected",
                            style: {
                                "background-color": "#3c5d51",
                                "border-color": "#B43F3F"
                            }
                        },
                        {
                            selector: "node[role^='category'].hl, node[role^='category']:selected",
                            style: {
                                "text-outline-color": "#B43F3F"
                            }
                        },
                        {
                            selector: "node[role='prop']",
                            style:{
                                "shape": "diamond",
                                "background-color": "#004880",
                                "width": "60px",
                                "height": "60px",
                                "label": "data(combinedLabel)",  // Use the combined label
                                "text-wrap": "wrap" 
                            }
                        },
                        {
                            selector: "edge[role='prop']",
                            style: {
                                "line-color": "#004880"
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
                    // layout: cose_layout
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

                cy_basic.on('click', "node[role^='category']", function(event) {
                    let currentTime = new Date().getTime();  // Get the current time
                
                    // Check if the time between two clicks is less than the delay, meaning it's a double-click
                    if (currentTime - lastClickTime < doubleClickDelay) {
                        // It's a double-click, call the toggleChemNodes function
                        toggleChemNodes(event.target);
                    }
                
                    lastClickTime = currentTime;  // Update the lastClickTime to the current time
                });
                // cy_basic.nodes("node[role^='category']").qtip({
                //     content: function () {
                //         if (this.data("role") === "category_tox_class" ) {
                //             var category = "\"Toxicity\"";
                //         } else if (this.data("role") === "category_use_class") {
                //             var category = "\"Use\"";
                //         }
                //         var qtip_content =
                //             "<div class='qtip-content'>" +
                //             "<b style='color:"+this.data("color")+"'>"+this.data("id")+"</b><br>\n" +
                //             "Category: "+category+"<br>\n" +
                //             "</div>";
                //         return qtip_content
                //     },
                //     position: {
                //         my: "top center",
                //         at: "bottom center"
                //     },
                //     style: {
                //         classes: "qtip-bootstrap qtip-wide",
                //         tip: {
                //             width: 20,
                //             height: 10
                //         }
                //     },
                //     show: {
                //         event: "click"
                //     },
                //     hide: {
                //         event: 'unfocus'
                //     }
                // });

                cy_basic.edges().qtip({
                    content: function () {
                        let sourceNode = this.source();
                        let chem_name = sourceNode.data("name");
                        if (this.data("role") === "tox_class") {
                            var qtip_content =
                                "<div class='qtip-content'><br>\n" +
                                "<b class='field-edge-tox'>Compound</b> | " + this.data("source") + " | " + chem_name+ "<br>\n" +
                                "<b class='field-edge-tox'>Toxicity class</b> | <span style='color:" + this.data("color") + "'>" + this.data("target") + "</span><br>\n" +
                                "<b class='field-edge-tox'>Score</b> | " + this.data("score") + "<br>\n" +
                                "<b class='field-edge-tox'># references</b> | " + this.data("n_refs") + "<br>\n" +
                                "</div>";
                        } else if (this.data("role") === "use_class") {
                            var qtip_content =
                                "<div class='qtip-content'><br>\n" +
                                "<b class='field-edge-use'>Compound</b> | " + this.data("source") + " | " + chem_name+ "<br>\n" +
                                "<b class='field-edge-use'>Use class</b> | <span style='color:" + this.data("color") + "'>" + this.data("target") + "</span><br>\n" +
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
                
                // cy.add({
                //     data: { id: 'Pesticide' },
                //     position: { x: 100, y: 100 },
                //     style: {
                //         // 'background-color': '#FF5733', // Base background color
                //         'background-image': 'url(static/images/nodes/pesticide-bottle.png )', // Background image
                //         'background-fit': 'cover',  // Scale the image to cover the node's shape
                //         'background-opacity': 0.8,  // Set opacity for the image to see the color beneath
                //         'background-image-opacity': 0.5, // Control how visible the image is
                //         'width': 100,
                //         'height': 100
                //     }
                // });

                selectClassification(true, 'use');

            })
            .catch(error => console.error('Error loading elements:', error));
    }

}

function filterNetworkByChemNode() {
    document.querySelectorAll('.classification-btn').forEach(btn => btn.classList.remove('active'));
    
    let selectedNodeId = document.getElementById('chem-node-select').value;
    if (!selectedNodeId) {
        // If no node is selected, reset the network
        selectClassification(true, 'use')
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
    reLayout(selectedNode.union(connectedEdges).union(neighborNodes), cose_layout);
    cy_basic.fit(selectedNode.union(connectedEdges).union(neighborNodes));
}

function changeChemNodeLabel(){
    let selectedLabel = document.getElementById('chem-node-label-select').value;
    let selectedLabel2 = 'data(' + selectedLabel + ')';
    cy_basic.style().selector('node[role="chem"]').style('label', selectedLabel2).update();
}

function selectClassification(first_time=false, selectedClass=null) {
    // let selectedClass = document.getElementById('category-select').value;
    let selectedNodes = cy_basic.nodes("[role^='category_" + selectedClass + "']");
    console.log(selectedNodes);
    
    if (first_time) {
        cy_basic.elements().hide();
        selectedNodes.show();
        reLayout(selectedNodes, initial_layout);
        cy_basic.fit(selectedNodes);  

    } else {

        // Get the connected edges and neighbor nodes
        let connectedEdges = selectedNodes.connectedEdges();
        let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());

        // Hide non-displayed elements
        cy_basic.elements().hide();
        selectedNodes.show();
        connectedEdges.show();
        neighborNodes.show();

        // Re-layout and fit view
        reLayout(selectedNodes.union(connectedEdges).union(neighborNodes), cose_layout);
        cy_basic.fit(selectedNodes.union(connectedEdges).union(neighborNodes));
    }
}

function reLayout(network, layout_name) {
    let layout = network.layout(layout_name);
    layout.run();
}

function toggleChemNodes(categoryNode) {
 
    // Find all connected 'chem' nodes
    const connectedEdges = categoryNode.connectedEdges();
    const chemNodes = connectedEdges.targets().add(connectedEdges.sources()).filter("[role='chem']");
    
    // Show category node, connected edges, and chem nodes
    categoryNode.show();
    connectedEdges.show();
    chemNodes.show();
 
    // Get all currently visible elements
    const visibleElements = cy_basic.elements(":visible");

    // Re-layout all visible elements
    reLayout(visibleElements, cose_layout);

    // Fit the view to the visible elements
    cy_basic.fit(visibleElements, 50);
}


document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablinks').click();
});
