let cy_graph;
// Define layouts
let cose_layout =
    {
    name: 'cose',
    fit: true,
    padding: 20,
    nodeRepulsion: 10000,
    nodeOverlap: 700
};
let initial_layout = {
    name: 'grid',
    fit: true,
    padding: 10,
};
let circle_layout = {
    name: 'circle',
    fit: true,
    padding: 10,
};

let lastClickTime = 0;  // Store the time of the last click
let doubleClickDelay = 300;  // Maximum delay between clicks (in milliseconds)
// const commonNetworkStyle = [];
const generalNetworkStyle = [ // the stylesheet for general graph
    {
        selector: "node",
        style: {
            "border-width": "0px",
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
            "border-color": "#004880",
        }
    },
    {
        selector: "node.hl2",
        style: {
            "border-width": "5px",
            "border-color": "#004880",
        }
    },
    {
        selector: "node[role='chem']",
        style: {
            "shape": "ellipse",
            "width": "40px",
            "height": "40px",
            "background-color": "#f0f0f0",
            "border-width": "5px",
            "border-color": "#172d4a",
            "label": "data(name)",
            "color": "#172d4a",
            "font-weight": "bold"
        }
    },
    {
        selector: "node[role='chem'].hl, node[role='chem']:selected",
        style: {
            "background-color": "#9a999a",
            "border-color": "#004880",
            "color": "white", 
            "text-background-shape": "round-rectangle",
            "text-background-color": "#004880",
            "text-background-opacity": "1",
            // "label": "data(label)",
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
        selector: "node[role^='category'].hl, node[role^='category']:selected",
        style: {
            "text-outline-color": "#004880"
        }
    },
    {
        selector: "edge[role^='category']",
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
            "line-color": "#004880",
            "z-index": "1"
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
            "label": "data(label)",
            "color": "white",
            "text-outline-width": "3px",
            "text-outline-color": "data(color)",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "wrap"
        }
    }
];
const singleNetworkStyle = [
    {
        selector: "node[role='chem']",
        style: {
            "shape": "ellipse",
            "width": "50px",
            "height": "50px",
            "background-color": "#f0f0f0",
            "border-width": "5px",
            "border-color": "#172d4a",
            "label": "data(name)",
            "color": "#172d4a",
            "font-size:": "25px",
            "font-weight": "bold",
            "text-valign": "center",
            "color": "white",
            "text-background-shape": "round-rectangle",
            "text-background-color": "#172d4a",
            "text-background-opacity": "1",
        }
    },
    {
        selector: "node[role='chem'].hl",
        style: {
            "width": "55px",
            "height": "55px",
            "font-size": "25px",
            "font-weight": "bold",
            "border-width": "5px",
            "border-color": "#004880",
            "background-color": "#9a999a",
            "border-color": "#004880",
            "color": "white", 
            "text-background-shape": "round-rectangle",
            "text-background-color": "#004880",
            "text-background-opacity": "1",
        }
    },
    {
        selector: "edge[role='attribute']",
        style: {
            "line-color": "#172d4a",
            "width": "10px"
        }
    },
    {
        selector: "edge[role='attribute'].hl",
        style: {
            "line-color": "#004880",
            "width": "15px"
        }
    },
    {
        selector: "node[role='isolated-attribute']",
        style: {
            "shape": "data(shape)",
            "width": "80px",
            "height": "80px",
            "background-color": "#ddd",
            "border-width": "3px",
            "border-color": "#9a999a",
            "border-opacity": "0",
            "label": "data(label)",
            "color": "#9a999a",
            // "text-outline-width": "3px",
            // "text-outline-color": "#9a999a",
            "text-halign": "center",
            "text-valign": "center",
            "font-size": "20px",
            "font-weight": "bold",
            "text-wrap": "wrap"
        }
    },
    {
        selector: "node[role='attribute']",
        style: {
            "shape": "data(shape)",
            "width": "80px",
            "height": "80px",
            "background-color": "data(colorBg)",
            "border-width": "3px",
            "border-color": "data(colorBorder)",
            "border-opacity": "1",
            "label": "data(label)",
            "color": "white",
            "text-outline-width": "3px",
            "text-outline-color": "data(colorBorder)",
            "text-halign": "center",
            "text-valign": "center",
            "font-size": "20px",
            "font-weight": "bold",
            "text-wrap": "wrap"
        }
    },
    {
        selector: "node[role='attribute'].hl",
        style: {
            "width": "82px",
            "height": "82px",
            "font-size": "22px",
            "border-color": "#004880",
            "text-outline-color": "#004880",
        }
    },
    {
        selector: "node[role^='category']",
        style: {
            "width": "50px",
            "height": "50px",
            "background-color": "data(colorBg)",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "font-size": "18px",
            "font-weight": "bold",
            "label": "data(label)",
            "color": "data(colorBorder)",
            "text-halign": "center",
            "text-valign": "center",
            "text-wrap": "wrap"
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
        selector: "node[role^='category'].hl",
        style: {
            "width": "53px",
            "height": "53px",
            "font-size": "20px",
            "border-color": "#004880",
            "color": "#004880"
        }
    },
    {
        selector: "edge[role^='category']",
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
        selector: "edge[role^='category'].hl",
        style: {
            "line-color": "#004880",
            "width": "5px"
        }
    },
    {
        selector: "node[role='prop']",
        style:{
            "shape": "round-diamond",
            "background-color": "data(colorBg)",
            "width": "50px",
            "height": "50px",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(combinedLabel)",
            "color": "#2c2e35",
            "font-weight": "bold",
            "text-valign": "center",
            "text-wrap": "wrap" 
        }
    },
    {
        selector: "node[role='prop'].hl",
        style:{
            "width": "52px",
            "height": "52px",
            "label": "data(hlLabel)",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1",
        }
    },
    {
        selector: "edge[role='prop']",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "node[role='base_tox']",
        style:{
            "shape": "round-hexagon",
            "background-color": "data(colorBg)",
            "width": "50px",
            "height": "50px",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(label)",
            "color": "#2c2e35",
            "font-weight": "bold",
            "text-valign": "center",
            "text-wrap": "wrap" 
        }
    },
    {
        selector: "node[role='base_tox'].hl",
        style:{
            "width": "52px",
            "height": "52px",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1",
        }
    },
    {
        selector: "edge[role='base_tox']",
        style: {
            "line-color": "data(color)"
        }
    },
    {
        selector: "node[role='moa']",
        style: {
            "shape": "round-heptagon",
            "background-color": "data(colorBg)",
            "width": "50px",
            "height": "50px",
            "border-width": "1px",
            "border-color": "data(colorBorder)",
            "border-opacity": "0",
            "label": "data(label)",
            "color": "#2c2e35",
            "text-valign": "center",
            "text-wrap": "wrap" 
        }
    },
    {
        selector: "node[role='moa'].hl",
        style: {
            "width": "52px",
            "height": "52px",
            "color": "#004880",
            "border-color": "#004880",
            "border-opacity": "1",
            "label": "data(fullLabel)",
            "text-background-color": "white",
            "text-background-opacity": "0.5",
            "text-justification": "left"
        }
    },
    {
        selector: "edge[role='moa']",
        style: {
            "line-color": "data(color)"
        }
    },
]

function updateIsolatedAttributes() {
    // Loop through each node with role "attribute"
    cy_graph.nodes("[role='attribute']").forEach(function(node) {
        // Find edges that source from this node
        const outgoingEdges = node.outgoers('edge');

        // Check if there are no outgoing edges
        if (outgoingEdges.length === 0) {
            // Change the role to 'isolated-attribute' if no outgoing edges
            node.data('role', 'isolated-attribute');
        } else {
            // Revert to 'attribute' role if there are outgoing edges
            node.data('role', 'attribute');
        }
    });

        // Apply qTip tooltip to isolated attribute nodes
        cy_graph.nodes("[role='isolated-attribute']").qtip({
            content: {
                text: 'No information available.'
            },
            position: {
                my: 'top center',
                at: 'bottom center'
            },
            style: {
                classes: 'qtip-dark qtip-rounded',
                tip: {
                    width: 8,
                    height: 4
                }
            },
            show: {
                event: 'mouseover'
            },
            hide: {
                event: 'mouseout'
        }
    });   
}

function initializeNetworkFeatures() {
    // Add mouseover and mouseout events
    cy_graph.on('mouseover mouseout', 'node', function (event) {
        var node = event.target;
        node.toggleClass("hl");
        node.connectedEdges().toggleClass("hl");
        node.neighborhood().toggleClass("hl2");
    });

    cy_graph.on('mouseover mouseout', 'edge', function (event) {
        var node = event.target;
        node.toggleClass("hl");
    });

    cy_graph.nodes("node[role='chem']").qtip({
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

    cy_graph.edges().qtip({
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
};

function initializeNetworkBasic() {
    if (!document.getElementById('cy_graph').hasChildNodes()) {
        fetch(jsonBasic)
            .then(response => response.json())
            .then(elements => {
                cy_graph = cytoscape({
                    container: document.getElementById('cy_graph'), // container to render in
                    elements: elements,
                    style: generalNetworkStyle,
                    // layout: cose_layout
                });

                initializeNetworkFeatures();

                cy_graph.on('click', "node[role^='category']", function(event) {
                    toggleChemNodes(event.target);
                });
                // cy_graph.nodes("node[role^='category']").qtip({
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
    
                // Populate dropdown with chemical nodes
                const chemNodes = cy_graph.nodes("[role='chem']");
                const select = document.getElementById('chem-select');
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

function loadSingleChemNetwork() {
    
    // Get the selected chemical ID (PTX code)
    let selectedChem = document.getElementById('chem-select').value;

    // If no node is selected, reset the network
    if (!selectedChem) {
        selectClassification(true, 'use');
        return;
    }

    // Fetch the smaller network JSON file for the selected chemical
    const jsonUrl = `/static/elements/single_chem/${selectedChem}_network.json`; // Modify this to the correct path
    fetch(jsonUrl)
        .then(response => response.json())
        .then(chemNetworkElements => {
            // Destroy the previous network  to clean up memory
            if (cy_graph) {
                cy_graph.destroy();
            }

            // Initialize the single chemical network
            cy_graph = cytoscape({
                container: document.getElementById('cy_graph'),
                elements: chemNetworkElements,
                style: singleNetworkStyle,
                layout: circle_layout
            });

            // Initialize common interactivity features
            initializeNetworkFeatures();

            // Display only chemical and attribute nodes
            let selectedNode = cy_graph.getElementById(selectedChem);
            let connectedEdges = selectedNode.connectedEdges();
            let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());
            let selectedElements = selectedNode.union(connectedEdges).union(neighborNodes);
            cy_graph.elements().hide();
            selectedElements.show();
            reLayout(selectedElements, cose_layout);
            cy_graph.fit(selectedElements);

            // Add click event to attribute nodes
            cy_graph.on('click', "node[role='attribute']", function(event) {
                let selectedNode = event.target;
                let connectedEdges = selectedNode.connectedEdges().filter("[subrole='attribute']");
                let neighborNodes = connectedEdges.targets();
                let selectedElements = connectedEdges.union(neighborNodes);
            
                // Check if the neighbor nodes are visible
                let areVisible = neighborNodes.first().style('display') !== 'none';
            
                if (areVisible) {
                    // If they are visible, hide them
                    selectedElements.hide();
                } else {
                    // If they are hidden, show them
                    selectedElements.show();
                    reLayout(cy_graph.elements(), cose_layout);
                    // let main = cy_graph.nodes("[role='chem']").union( cy_graph.nodes("[role='category']") );
                    // main.layout(circle_layout)
                    // neighborNodes.layout(circle_layout).run();
                    cy_graph.fit(cy_graph.elements());
                }
            });

            updateIsolatedAttributes();

        })
        .catch(error => {
            console.error(
                `Error loading single chemical network ${selectedChem}_network.json:`, 
                error
            );
        });

    // 'Deactivate' classification buttons
    document.querySelectorAll('.classification-btn').forEach(
        btn => btn.classList.remove('active')
    );
}

function changeChemNodeLabel(){
    let selectedLabel = document.getElementById('chem-node-label-select').value;
    let selectedLabel2 = 'data(' + selectedLabel + ')';
    cy_graph.style().selector('node[role="chem"]').style('label', selectedLabel2).update();
}

function selectClassification(first_time=false, selectedClass=null) {
    // let selectedClass = document.getElementById('category-select').value;
    let selectedNodes = cy_graph.nodes("[role^='category_" + selectedClass + "']");
    console.log(selectedNodes);
    
    if (first_time) {
        cy_graph.elements().hide();
        selectedNodes.show();
        reLayout(selectedNodes, initial_layout);
        cy_graph.fit(selectedNodes);  

    } else {

        // Get the connected edges and neighbor nodes
        let connectedEdges = selectedNodes.connectedEdges();
        let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());

        // Hide non-displayed elements
        cy_graph.elements().hide();
        selectedNodes.show();
        connectedEdges.show();
        neighborNodes.show();

        // Re-layout and fit view
        reLayout(selectedNodes.union(connectedEdges).union(neighborNodes), cose_layout);
        cy_graph.fit(selectedNodes.union(connectedEdges).union(neighborNodes));
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
    const visibleElements = cy_graph.elements(":visible");

    // Re-layout all visible elements
    reLayout(visibleElements, cose_layout);

    // Fit the view to the visible elements
    cy_graph.fit(visibleElements, 50);
}


document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablinks').click();
});
