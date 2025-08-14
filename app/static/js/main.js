let cy_graph;
let lastClickTime = 0;  // Store the time of the last click
let doubleClickDelay = 300;  // Maximum delay between clicks (in milliseconds)
let isSingleChemNetwork = false; // Tracks if a single chemical network is loaded

function redirectToChemical(selectedChem) {
    if (selectedChem) {
        window.location.href = `/${encodeURIComponent(selectedChem)}`;
    }
}

function displayCategoryChemicals(categoryNode) {
    document.getElementById('chem-info-section').style.display = 'none';
    document.getElementById('change_label_size_container').style.display = 'none';
    
    // Get all connected chemical nodes
    const connectedEdges = categoryNode.connectedEdges();
    // const chemNodes = connectedEdges.targets().add(connectedEdges.sources()).filter("[role='chem']");
    const category = categoryNode.data('role').split('_')[1];
    console.log(category);
    if (connectedEdges.visible()) {
        // Extract the `ptx_code` and `name` of each associated chemical node
        const chemData = connectedEdges.map(edge => ({
            ptx_code: edge.data('ptx_code') || 'N/A',
            name: edge.data('chem_name') || 'N/A',
            score: edge.data('score') || 'N/A',
            refs: edge.data('n_refs') || 'N/A'
        }));

        // If there are no associated chemicals, hide the section and return
        if (chemData.length === 0) {
            document.getElementById('category-info-section').style.display = 'none';
            return;
        }

        // Show the `chem-info-section`
        document.getElementById('category-info-section').style.display = 'block';

        // Build the table content
        let tableContent;
        let tableColumns;
        if (category === "tox") {
            tableColumns = `
                <th>PTX Code</th>
                <th>Name</th>
                <th>Score</th>
                <th># PubMed Refences</th>
            `;
            tableContent = chemData.map(chem => `
                <tr>
                    <td><a href='/${chem.ptx_code}'>${chem.ptx_code}</a></td>
                    <td>${chem.name}</td>
                    <td>${chem.score}</td>
                    <td>${chem.refs}</td
                </tr>
            `).join('');
        } else if (category === "use") {
            tableColumns = `
                <th>PTX Code</th>
                <th>Name</th>
            `;
            tableContent = chemData.map(chem => `
                <tr>
                    <td><a href='/${chem.ptx_code}'>${chem.ptx_code}</a></td>
                    <td>${chem.name}</td>
                </tr>
            `).join('');
        }

        // Update the content of `chem-info-section` with the new table
        const tableHtml = `
            <div class="category-header">
                <div 
                    class="category-header-background" 
                    style="background: linear-gradient(90deg, ${categoryNode.data('color_border')}, ${categoryNode.data('color_bg')}); border-radius: 5px; z-index: 0;"></div> 
                <img 
                    src='${imageBaseUrl}/nodes/${categoryNode.data('image')}' 
                    alt='Category Image' 
                    class='category-header-image' 
                >
                <h2>${categoryNode.data("id")}</h2>
            </div>
            <table id="category-chem-table" class="chem-associated-table">
                <thead>
                    <tr>
                        ${tableColumns}
                    </tr>
                </thead>
                <tbody>
                    ${tableContent}
                </tbody>
            </table>
        `;
        document.getElementById('category-info-section').innerHTML = tableHtml;

        $('#category-chem-table').DataTable({
            paging: false,       // Disable pagination
            searching: false,    // Disable the search box
            info: false,         // Disable the table info
            order: [[0, 'asc']], // Set default sorting 
            columnDefs: [
                { targets: '_all', className: 'dt-center' } // Center-align all columns
            ]
        });
    } else {
        document.getElementById('category-info-section').style.display = 'none';
    }
    if (cy_graph.edges(':visible').length > 0) {
        document.getElementById('change_label_size_container').style.display = 'block';
    }
}

function initializeCytoscape(selectedChem = null) {
    if (selectedChem) {
        populateChemSelect().then(() => {
            document.getElementById('chem-select').value = selectedChem;
            loadSingleChemNetwork(selectedChem);
            // document.getElementById('chem-select').dispatchEvent(new Event('change'));
        });
    } else {
        initializeNetworkBasic();
    }
}

// Basic Network Functions
function initializeNetworkBasic() {
    if (!document.getElementById('cy_graph').hasChildNodes()) {
        fetch(jsonBasic)
            .then(response => response.json())
            .then(elements => {
                cy_graph = cytoscape({
                    container: document.getElementById('cy_graph'),
                    elements: elements,
                    style: generalNetworkStyle,
                    zoomingEnabled: true,
                    userZoomingEnabled: false, 
                    wheelSensitivity: 0.5
                    // layout: cose_layout
                });
                initializeBasicNetworkFeatures();
                selectClassification(true, 'use');
                populateChemSelect(basicNetworkloaded=true);
            })
            .catch(error => console.error('Error loading elements:', error));
    }
}

function initializeBasicNetworkFeatures() {
    commonNetworkFeatures()

    cy_graph.on('click', "node[role^='category']", function(event) {
        let categoryNode = event.target;
        toggleChemNodes(categoryNode);
        displayCategoryChemicals(categoryNode);
    });

    cy_graph.edges().qtip({
        content: function () {
            let chemNode = this.target();
            let chemName = chemNode.data("name");
            if (this.data("role") === "tox_class") {
                var qtip_content =
                `<div class='qtip-content'><br>
                    <b class='field-edge-tox'>Toxicity class</b> | <span style='color:${this.data("color")}; font-weight: bold'>${this.data("source")}</span><br>
                    <b class='field-edge-tox'>Compound</b> | [${this.data("target")}] ${chemName} <br>
                    <b class='field-edge-tox'>Score</b> | ${this.data("score")} <br>
                    <b class='field-edge-tox'># references</b> | ${this.data("n_refs")} <br>
                </div>`;
            } else if (this.data("role") === "use_class") {
                var qtip_content =
                `<div class='qtip-container'>
                    <div class='qtip-row'>
                        <div class='qtip-label'>Use class</div>
                        <div class='qtip-value'><span style='color:${this.data("color")}; font-weight: bold'> ${this.data("source")}</span></div>
                    </div>
                    <div class='qtip-row'> 
                        <div class='qtip-label'>Compound</div> 
                        <div class='qtip-value'>[${this.data("target")}] ${chemName}</div>
                    </div>
                </div>`;
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

       // Apply qTip tooltip to isolated attribute nodes
       cy_graph.nodes("[role^='category']").qtip({
        content: {
            text: function () {
                return `${this.data('chem_number')} chemicals associated to this category.<br>Click to display/hide.`;
            }
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

function commonNetworkFeatures() {
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
                var drugbank = "<b class='field'>DrugBank AN</b> | N/A<br>\n";
            } else {
                var drugbank = "<b class='field'>DrugBank AN</b> | <a href='https://go.drugbank.com/drugs/" + this.data("db_id") + "' target='_blank'>" + this.data("db_id") + "</a><br>\n";
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
                "<div class='qtip-content' style='max-height: 200px; overflow-y: auto; position: relative;'>" +
                
                "<div style='position: absolute; top: 5px; right: 5px;'>" +
                "<a href='https://dex.precisiontox.org/chem/" + this.data("ptx_code") + "' target='_blank' style='display: inline-flex; align-items: center; background-color: #004880; color: white; padding: 4px 8px; border-radius: 4px; text-decoration: none; font-size: 12px;'>" +
                "<i class='fas fa-search-plus' style='margin-right: 4px;'></i>Go to chemical" +
                "</a></div>" +

                "<b class='field'>Compound</b><b>  | " + this.data("name") + "</b> <br>\n" +
                "<b class='field'>PTX Code</b> | " + this.data("ptx_code") + "<br>\n" +
                "<b class='field'>CAS Number</b> | " + this.data("cas") + "<br>\n" +
                "<b class='field'>DSSTox ID</b> | <a href='https://comptox.epa.gov/dashboard/chemical/details/"+this.data("dtxsid")+"' target='_blank'>"+this.data("dtxsid") + "</a><br>\n" +
                "<b class='field'>PubChem CID</b> | <a href='https://pubchem.ncbi.nlm.nih.gov/compound/"+this.data("cid")+"' target='_blank'>"+this.data("cid") + "</a><br>\n" +
                drugbank+
                "<b class='field'>Molecular Formula</b> | " + formatMolecularFormula(this.data("formula")) + "<br>\n" +
                "<b class='field'>SMILES</b> | " + this.data("smiles") + "<br>\n" +
                "<b class='field'>InChIKey</b> | " + this.data("inchi") + "<br>\n" +
                // mw + solubility + henry + log_kaw + log_kow + pka_acid + pka_base + dlipw + fdf + density +
                "</div><br>";
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
};

function selectClassification(first_time=false, selectedClass=null) {
    // let selectedClass = document.getElementById('category-select').value;
    let selectedNodes = cy_graph.nodes("[role^='category_" + selectedClass + "']");
    
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

function loadBasicNetworkAndClassify(classificationType) {
    // Load the basic network JSON file
    fetch(jsonBasic)
        .then(response => response.json())
        .then(elements => {
            // Destroy the current single chemical network
            if (cy_graph) {
                cy_graph.destroy();
            }

            // Initialize Cytoscape with the full basic network
            cy_graph = cytoscape({
                container: document.getElementById('cy_graph'),
                elements: elements,
                style: generalNetworkStyle,
                zoomingEnabled: true,
                userZoomingEnabled: false, 
                wheelSensitivity: 0.5,
                layout: initial_layout  // Adjust layout as needed
            });

            // Initialize interactions for the basic network
            initializeBasicNetworkFeatures();

            // Call selectClassification based on the passed classification type
            selectClassification(true, classificationType);

            isSingleChemNetwork = false;
        })
        .catch(error => console.error('Error loading basic network:', error));

    // Update button active state
    document.querySelectorAll('.classification-btn').forEach(button => {
        button.classList.remove('active');
    });
    document.getElementById(`${classificationType}-button`).classList.add('active');
    document.getElementById('chem-info-section').style.display = 'none';
}

function toggleChemNodes(categoryNode) {
    // Get all connected chemical nodes and edges
    const connectedEdges = categoryNode.connectedEdges();
    const chemNodes = connectedEdges.targets().add(connectedEdges.sources()).filter("[role='chem']");

    // Determine if we should hide or show chem nodes
    const isAlreadyVisible = connectedEdges.every(edge => edge.visible());
    if (isAlreadyVisible) {
        // Hide all edges for the category node
        connectedEdges.hide();
        // Hide chem nodes that are only connected to it
        const chemNodesWithNoVisibleEdges = cy_graph.nodes("[role='chem']").filter(node => {
            // Check if the node has no visible connected edges
            return node.connectedEdges(":visible").length === 0;
        });
        chemNodesWithNoVisibleEdges.hide();        
    } else {
        // Show all connected edges and chem nodes
        connectedEdges.show();
        chemNodes.show();
    }

    // const visibleEdges = cy_graph.edges(":visible");
    // const visibleNodes = cy_graph.nodes(":visible");
    
    // const offsetY = 1200;  


    // // Apply cose layout only to the selected category and its chemical nodes
    // // categoryNode.union(chemNodes).union(connectedEdges).positions((node, i) => {
    // cy_graph.elements(":visible").positions((node, i) => {
    //     return {
    //         x: node.position("x"),
    //         y: node.position("y") + offsetY // Shift nodes downward
    //     };
    // }).layout({
    //     // cy_graph.elements(":visible").nodes("[role='chem']").layout({
    //     name: 'cose',
    //     fit: true, // Fit the subset inside its space
    //     nodeRepulsion: 10000,
    //     nodeOverlap: 700,
    //     avoidOverlap: true
    // }).run();

    // // Apply grid layout to only category nodes
    // cy_graph.nodes("[role^='category']").layout({
    //     name: 'grid',
    //     fit: false,  // Avoid rescaling the entire graph
    //     // rows: 1,     // Keep category nodes in a row
    //     avoidOverlap: true,
    //     position: function (node) {
    //         return {
    //             x: node.position("x"),
    //             y: node.position("y") - offsetY // Keep them above
    //         };
    //     }
    // }).run();

    const activeEles = categoryNode.union(chemNodes).union(connectedEdges);
    const categoryNodes = cy_graph.nodes(":visible[role ^='category']").not(activeEles);
    // const nonCategoryNodes = cy_graph.nodes(":visible").not(categoryNodes);
    
    // 🟢 Step 1: Apply `cose` to non-category nodes (without label dimensions)
    activeEles.layout({
        name: 'cose',
        fit: true,
        padding: 20,
        nodeRepulsion: 10000,
        nodeOverlap: 700,
        nodeDimensionsIncludeLabels: false // Default behavior
    }).run();
    
    // 🔵 Step 2: Apply `cose` to category nodes (with label dimensions)
    categoryNodes.layout({
        name: 'cose',
        fit: false,
        padding: 20,
        nodeRepulsion: 2000, // Extra spacing
        nodeOverlap: 700,
        nodeDimensionsIncludeLabels: true // Enable label-based separation
    }).run();
    
    // // 🔥 Step 3: Ensure category nodes don’t overlap with others
    const bbox = activeEles.boundingBox(); // Get the bounding box of the non-category nodes

    categoryNodes.positions((node, i) => ({
        x: node.position("x"),  // Keep the x position the same
        y: node.position("y") - bbox.h - 10000 - (i * 50) // Move all category nodes up
    }));
        
    // // Fit everything
    // cy_graph.fit(cy_graph.elements(":visible"));

    // // Fit the view to the visible elements
    // const visibleElements = cy_graph.elements(":visible");
    // reLayout(visibleElements, cose_layout);
    // visibleElements.layout({
    //     name: "cose",
    //     fit: true,
    //     padding: 20,
    //     nodeRepulsion: node => node.data("role").startsWith("category") ? 200000 : 10000, // More separation for category nodes
    //     nodeOverlap: 700
    // }).run();
    // console.log(cy_graph.nodes(":visible[role^='category']").length);
    // cy_graph.nodes(":visible[role^='category']").layout({
    //     name: 'cose',
    //     fit: true,
    //     padding: 20,
    //     nodeRepulsion: 10000,
    //     nodeOverlap: 700,
    // }).run();
    // cy_graph.fit(visibleElements);
}


// Single Chemical Network Functions
function loadSingleChemNetwork(selectedChem) {
    document.getElementById('change_label_size_container').style.display = 'none';

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
                zoomingEnabled: true,
                userZoomingEnabled: false, 
                wheelSensitivity: 0.5,
                layout: circle_layout
            });

            cy_graph.ready(() => {
                // Display only chemical and attribute nodes
                let selectedNode = cy_graph.nodes("[role='chem']");
                let connectedEdges = selectedNode.connectedEdges();
                let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());
                let selectedElements = selectedNode.union(connectedEdges).union(neighborNodes);
                cy_graph.elements().hide();
                selectedElements.show();
                reLayout(selectedElements, cose_layout);
                cy_graph.fit(selectedElements);
                
                // Initialize interactivity features
                initializeSingleChemNetworkFeatures();
            });
            displayChemicalInfo(selectedChem);
            isSingleChemNetwork = true;
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

function initializeSingleChemNetworkFeatures() {
    commonNetworkFeatures();    
    updateIsolatedAttributes();

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

    // Apply qTip tooltip to attribute nodes
    cy_graph.nodes("[role='attribute']").qtip({
        content: {
            text: 'Click to display/hide information.'
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


function displayChemicalInfo(selectedChem) {
    document.getElementById('category-info-section').style.display = 'none';
    
    fetch(`chemical_data/${selectedChem}`)
    .then(response => response.json())
    .then(data => {
        // Check if there's an error in the response
        if (data.error) {
            console.error(data.error);
            alert("Chemical data not found.");
            return;
        }
        
        // Show the chemical info section
        document.getElementById('chem-info-section').style.display = 'block';
        
        // Populate the section with data
        document.getElementById('chem-structure').innerHTML =
        `<img 
            src='${imageBaseUrl}/chem_structures/${data.pubchem_cid}.png' 
            alt='<chemical structure image not found>' 
        >`
        document.getElementById('chem-ptx-code').textContent = data.ptx_code || 'N/A';
        document.getElementById('chem-name').textContent = data.chem_name || 'N/A';
        document.getElementById('chem-common-name').textContent = data.chem_name_user || 'N/A';
        document.getElementById('chem-cas').textContent = data.casrn || 'N/A';
        document.getElementById('chem-dsstox-id').innerHTML = data.dtxsid
                ? `<a href="https://comptox.epa.gov/dashboard/chemical/details/${data.dtxsid}" target="_blank">${data.dtxsid}</a>`
                : 'N/A';
        document.getElementById('chem-pubchem-cid').innerHTML = data.pubchem_cid
        ? `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${data.pubchem_cid}" target="_blank">${data.pubchem_cid}</a>`
        : 'N/A';
        document.getElementById('chem-drugbank-id').innerHTML = data.drugbank_id
        ? `<a href="https://go.drugbank.com/drugs/${data.drugbank_id}" target="_blank">${data.drugbank_id}</a>`
        : 'N/A';
        document.getElementById('chem-formula').innerHTML = formatMolecularFormula(data.formula) || 'N/A';
        document.getElementById('chem-smiles').textContent = data.smiles || 'N/A';
        document.getElementById('chem-inchi').textContent = data.inchikey || 'N/A';
        document.getElementById('chem-use').textContent = data.use_class || 'N/A';
        document.getElementById('chem-tox').textContent = data.tox_class || 'N/A';

        document.getElementById('chem-mw').textContent = data.mw_g_mol || 'N/A';
        document.getElementById('chem-solubility').textContent = data.solubility_h2o_mol_liter || 'N/A';
        document.getElementById('chem-source-solubility').textContent = data.source_solubility_h2o || 'N/A';
        document.getElementById('chem-henry').textContent = data.henry_coefficient_atm_m3_mol || 'N/A';
        document.getElementById('chem-source-henry').textContent = data.source_henry || 'N/A';
        document.getElementById('chem-log-kaw').textContent = data.log_kaw_kh_rt || 'N/A';
        document.getElementById('chem-source-kaw').textContent = data.source_kaw || 'N/A';
        document.getElementById('chem-log-kow').textContent = data.log_kow_liter_liter || 'N/A';
        document.getElementById('chem-source-kow').textContent = data.source_kow || 'N/A';
        document.getElementById('chem-pka-acid').textContent = data.pka_acid || 'N/A';
        document.getElementById('chem-source-pka-acid').textContent = data.source_pka || 'N/A';
        document.getElementById('chem-pka-base').textContent = data.pka_base || 'N/A';
        document.getElementById('chem-source-pka-base').textContent = data.source_pka || 'N/A';
        document.getElementById('chem-log-dlipw').textContent = data.log_dlipw_ph74_liter_liter || 'N/A';
        document.getElementById('chem-source-dlipw').textContent = data.source_dlipw || 'N/A';
        document.getElementById('chem-fdf').textContent = data.freely_dissolved_fraction || 'N/A';
        document.getElementById('chem-density').textContent = data.density_kg_liter || 'N/A';
        document.getElementById('chem-source-density').textContent = data.source_density || 'N/A';
        document.getElementById('chem-boiling').textContent = data.boiling_point || 'N/A';
        document.getElementById('chem-source-boiling').textContent = data.source_boiling_point || 'N/A';
        document.getElementById('chem-melting').textContent = data.melting_point || 'N/A';
        document.getElementById('chem-source-melting').textContent = data.source_melting_point || 'N/A';
        document.getElementById('chem-vapor-pressure').textContent = data.vapor_pressure || 'N/A';
        document.getElementById('chem-source-vapor-pressure').textContent = data.source_vapor_pressure || 'N/A';
        document.getElementById('base-tox-celegans').textContent = data.baseline_celegans || 'N/A';
        document.getElementById('base-tox-drerio').textContent = data.baseline_drerio || 'N/A';
        document.getElementById('base-tox-dmagna').textContent = data.baseline_dmagna || 'N/A';
        document.getElementById('base-tox-dmelanogaster').textContent = data.baseline_dmelanogaster || 'N/A';
        document.getElementById('base-tox-cells').textContent = data.baseline_cells || 'N/A';
        document.getElementById('base-tox-cells-generic').textContent = data.baseline_cells_generic_micromole_liter_free_ec10 || 'N/A';
        document.getElementById('base-tox-xlaevis').textContent = data.baseline_xlaevis || 'N/A';
        document.getElementById('moa-drugbank').textContent = data.moa_drugbank || 'N/A';
        document.getElementById('moa-t3db').textContent = data.moa_t3db || 'N/A';
        populateAopTable(data.aop || []);
        populateTargetsTable(data.targets || []);
        showTable('phys-properties-table');
    });
}

function populateAopTable(aopData) {
    const aopTableBody = document.getElementById('aop-table-body');
    aopTableBody.innerHTML = ''; // Clear existing content

    if (Array.isArray(aopData) && aopData.length > 0) {
        aopData.forEach(aop => {
            const row = document.createElement('tr');

            const aopIdCell = document.createElement('td');
            // aopIdCell.textContent = 'AOP: '+aop.AOP_id|| 'N/A';
            aopIdCell.innerHTML = aop.AOP_id 
            ? `<a href="https://aopwiki.org/aops/${aop.AOP_id }" target="_blank">${'AOP: '+aop.AOP_id }</a>`
            : 'N/A';

            const aopNameCell = document.createElement('td');
            aopNameCell.textContent = aop.AOP_name || 'N/A';
            // aopNameCell.innerHTML = aop.AOP_name
            // ? `<a href="https://aopwiki.org/aops/${aop.AOP_id }" target="_blank">${aop.AOP_name }</a>`
            // : 'N/A';


            row.appendChild(aopIdCell);
            row.appendChild(aopNameCell);
            aopTableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = 2;
        noDataCell.textContent = 'No data available';
        row.appendChild(noDataCell);
        aopTableBody.appendChild(row);
    }
}

function populateTargetsTable(data) {
    const TableBody = document.getElementById('targets-table-body');
    TableBody.innerHTML = ''; // Clear existing content

    if (Array.isArray(data) && data.length > 0) {
        data.forEach(target => {
            const row = document.createElement('tr');

            const Cell = document.createElement('td');
            Cell.textContent = target|| 'N/A';

            row.appendChild(Cell);
            TableBody.appendChild(row);
        });
    } else {
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = 2;
        noDataCell.textContent = 'No data available';
        row.appendChild(noDataCell);
        TableBody.appendChild(row);
    }
}

// Utility Functions
function formatMolecularFormula(formula) {
    // Ensure the input is a string before applying the regex
    if (typeof formula !== "string") {
        return formula; // Return as-is if it's not a string
    }
    
    // Use regex to wrap numbers in <sub> tags
    return formula.replace(/(\d+)/g, "<sub>$1</sub>");
}

function populateChemSelect(basicNetworkLoaded = false) {
    const select = document.getElementById('chem-select');
    select.innerHTML = '<option value="">Select a compound...</option>';

    return new Promise((resolve, reject) => {
        if (basicNetworkLoaded) {
            const chemNodes = cy_graph.nodes("[role='chem']");
            chemNodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id();
                option.textContent = node.data('label') || node.id();
                select.appendChild(option);
            });
            resolve();
        } else {
            fetch(jsonBasic)
                .then(response => response.json())
                .then(elements => {
                    const basicChemNodes = elements.filter(node => node.group === 'nodes' && node.data.role === 'chem');
                    basicChemNodes.forEach(node => {
                        const option = document.createElement('option');
                        option.value = node.data.id;
                        option.textContent = node.data.label || node.data.id;
                        select.appendChild(option);
                    });
                    resolve();
                })
                .catch(error => {
                    console.error('Error loading basic network for chem-select:', error);
                    reject(error);
                });
        }
    }).then(() => {
        // Initialize Select2 after options are populated
        $(select).select2({
            placeholder: "Type to search for a compound...",
            allowClear: true
        });
    });
}

function changeLabelFontSize(fontSize) {
    if (!isSingleChemNetwork) {
        cy_graph.style().selector('node[role="chem"]').style('font-size', fontSize + 'px').update();
    }  
}

function changeChemNodeLabel(){
    let selectedLabel = document.getElementById('chem-node-label-select').value;
    let selectedLabel2 = 'data(' + selectedLabel + ')';
    cy_graph.style().selector('node[role="chem"]').style('label', selectedLabel2).update();
}

function reLayout(network, layout_name) {
    let layout = network.layout(layout_name);
    layout.run();
}

function resetNetwork() {
    if (isSingleChemNetwork) {
        // Reset for single chemical network
        const selectedChem = document.getElementById('chem-select').value;
        if (selectedChem) {
            loadSingleChemNetwork(selectedChem); // Reload with the currently selected chemical
        }
    } else {
        // Reset for basic network
        const activeButton = document.querySelector('.classification-btn.active');
        if (activeButton) {
            const classificationType = activeButton.id.includes('use') ? 'use' : 'tox';
            loadBasicNetworkAndClassify(classificationType);
        }
    }
}

// DataTable
function loadChemList() {
    if (!$.fn.DataTable.isDataTable('#chem-table')) {
        fetch('/get_chemicals')
            .then(response => response.json())
            .then(data => {
                const tableHeader = document.getElementById('chem-table-header');
                const tableBody = document.getElementById('chem-table-body');

                // Clear any existing content
                tableHeader.innerHTML = '';
                tableBody.innerHTML = '';

                // Create the table header
                if (data.length > 0) {
                    const headers = Object.keys(data[0]);
                    headers.forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        tableHeader.appendChild(th);
                    });
                }

                // Populate the table body
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    Object.entries(row).forEach(([key, value]) => {
                        const td = document.createElement('td');
                        
                        // Check if this is the molecular formula column
                        if (key.toLowerCase() === "formula" || key.toLowerCase() === "molecular formula") {
                            td.innerHTML = formatMolecularFormula(value); // Use innerHTML for proper rendering
                        } else {
                            td.textContent = value; // Use textContent for other fields
                        }

                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });

                // Initialize DataTable
                const chem_table = $('#chem-table').DataTable({
                    dom: 'lBfrtip', // Enable buttons
                    buttons: [
                        'copy', 'csv', 'excel'
                    ],
                    scrollY: '65vh', // Vertical scrolling (adjust height as needed)
                    scrollX: true,   // Enable horizontal scrolling
                    scrollCollapse: true, // Allows the table to reduce in height when fewer rows are shown
                    paging: false,
                    columnDefs: [
                        { width: '150px', targets: '_all' } // Set the width for all columns
                    ],
                    drawCallback: function() { // Add tooltips after the table is drawn
                        $('#chem-table tbody td').each(function() {
                            // Destroy any existing tooltip instance to avoid duplicates
                            if ($(this).data('qtip')) $(this).qtip('destroy', true);

                            // Determine if this cell is in the rightmost column
                            let isRightmost = $(this).is(':last-child');

                            $(this).qtip({
                                content: {
                                    text: $(this).text().trim()
                                },
                                style: {
                                    classes: 'qtip-dark qtip-rounded'
                                },
                                position: {
                                    my: isRightmost ? 'top right' : 'top left',
                                    at: isRightmost ? 'bottom left' : 'bottom right'
                                }
                            });
                        });
                    }
                });
                let loaderTimeout;

                chem_table.on('order.dt', function () {
                    $('#loader').show();
                    loaderTimeout = setTimeout(() => {}, 200); // Start timer
                });

                chem_table.on('draw.dt', function () {
                    const hideLoader = () => $('#loader').hide();
                    if (loaderTimeout) {
                        clearTimeout(loaderTimeout);
                        setTimeout(hideLoader, 200); // Keep spinner for minimum time
                    } else {
                        hideLoader();
                    }
                }); 
            })
            .catch(error => console.error('Error loading chemical list:', error));
    }
}


document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablinks').click();
    // Add event listener for the reset button
    document.getElementById('reset-button').addEventListener('click', resetNetwork);
    
});

document.getElementById('cy_graph').addEventListener('wheel', function(event) {
    if (!event.ctrlKey && !event.metaKey) {  
        // ✅ Stop Cytoscape from hijacking the scroll event
        event.stopPropagation();
        
        // ✅ Allow normal page scrolling
        window.scrollBy({
            top: event.deltaY,
            behavior: 'auto' 
        });
    }
}, { passive: false });
