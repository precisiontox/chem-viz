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
                    <td><a href='${buildChemicalPath(chem.ptx_code)}'>${chem.ptx_code}</a></td>
                    <td>${chem.name}</td>
                    <td>${chem.score}</td>
                    <td>${chem.refs}</td>
                </tr>
            `).join('');
        } else if (category === "use") {
            tableColumns = `
                <th>PTX Code</th>
                <th>Name</th>
            `;
            tableContent = chemData.map(chem => `
                <tr>
                    <td><a href='${buildChemicalPath(chem.ptx_code)}'>${chem.ptx_code}</a></td>
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
