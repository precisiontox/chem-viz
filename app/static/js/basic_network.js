let cy_graph;
let lastClickTime = 0;  // Store the time of the last click
let doubleClickDelay = 300;  // Maximum delay between clicks (in milliseconds)
let isSingleChemNetwork = false; // Tracks if a single chemical network is loaded


function displayCategoryChemicals(categoryNode) {
    document.getElementById('chem-info-section').style.display = 'none';
    
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
                    <td>${chem.ptx_code}</td>
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
                    <td>${chem.ptx_code}</td>
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
                    src='${imageBaseUrl}${categoryNode.data('image')}' 
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
                    // layout: cose_layout
                });
                initializeBasicNetworkFeatures();
                selectClassification(true, 'use');
                populateChemSelect();
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
                // mw + solubility + henry + log_kaw + log_kow + pka_acid + pka_base + dlipw + fdf + density +
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
};

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
    // Find all connected 'chem' nodes and edges
    const connectedEdges = categoryNode.connectedEdges();
    const chemNodes = connectedEdges.targets().add(connectedEdges.sources()).filter("[role='chem']");

    // Determine if we should hide or show chem nodes
    const isAlreadyVisible = connectedEdges.every(edge => edge.visible());

    if (isAlreadyVisible) {
        connectedEdges.hide();
        const chemNodesWithNoVisibleEdges = cy_graph.nodes("[role='chem']").filter(node => {
            // Check if the node has no visible connected edges
            return node.connectedEdges(":visible").length === 0;
        });
        chemNodesWithNoVisibleEdges.hide();        
    } else {
        // Show category node (always keep it visible), connected edges, and chem nodes
        connectedEdges.show();
        chemNodes.show();
    }

    // Get all currently visible elements
    const visibleElements = cy_graph.elements(":visible");

    // Re-layout all visible elements
    reLayout(visibleElements, cose_layout);

    // Fit the view to the visible elements
    cy_graph.fit(visibleElements);
}


// Single Chemical Network Functions
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
            initializeSingleChemNetworkFeatures();
            
            // Display only chemical and attribute nodes
            let selectedNode = cy_graph.getElementById(selectedChem);
            let connectedEdges = selectedNode.connectedEdges();
            let neighborNodes = connectedEdges.targets().add(connectedEdges.sources());
            let selectedElements = selectedNode.union(connectedEdges).union(neighborNodes);
            cy_graph.elements().hide();
            selectedElements.show();
            reLayout(selectedElements, cose_layout);
            cy_graph.fit(selectedElements);
            
            isSingleChemNetwork = true;

            displayChemicalInfo(selectedChem);
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
        document.getElementById('chem-ptx-code').textContent = data.ptx_code || 'N/A';
        document.getElementById('chem-name').textContent = data.chem_name || 'N/A';
        document.getElementById('chem-common-name').textContent = data.chem_name_user || 'N/A';
        document.getElementById('chem-dsstox-id').innerHTML = data.dtxsid
                ? `<a href="https://comptox.epa.gov/chemexpo/chemical/${data.dtxsid}" target="_blank">${data.dtxsid}</a>`
                : 'N/A';
        document.getElementById('chem-cas').textContent = data.casrn || 'N/A';
        document.getElementById('chem-drugbank-id').innerHTML = data.drugbank_id
        ? `<a href="https://go.drugbank.com/drugs/${data.drugbank_id}" target="_blank">${data.drugbank_id}</a>`
        : 'N/A';
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
            aopIdCell.textContent = aop.AOP_id|| 'N/A';
            // aopIdCell.innerHTML = aop.AOP_id 
            // ? `<a href="https://aopwiki.org/aops/${aop.AOP_id }" target="_blank">${aop.AOP_id }</a>`
            // : 'N/A';

            const aopNameCell = document.createElement('td');
            // aopNameCell.textContent = aop.AOP_name || 'N/A';
            aopNameCell.innerHTML = aop.AOP_name
            ? `<a href="https://aopwiki.org/aops/${aop.AOP_id }" target="_blank">${aop.AOP_name }</a>`
            : 'N/A';


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
function populateChemSelect() {
    const chemNodes = cy_graph.nodes("[role='chem']");
    const select = document.getElementById('chem-select');

    // Clear existing options
    select.innerHTML = '<option value="">Select a compound...</option>';

    // Populate the dropdown
    chemNodes.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id();
        option.textContent = node.data('label') || node.id();
        select.appendChild(option);
    });

    // Initialize Select2 with search enabled
    $(select).select2({
        placeholder: "Type to search for a compound...",
        allowClear: true
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
            loadSingleChemNetwork(); // Reload with the currently selected chemical
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

document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.tablinks').click();
    // Add event listener for the reset button
    document.getElementById('reset-button').addEventListener('click', resetNetwork);
});
