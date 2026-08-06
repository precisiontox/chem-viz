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
                ? `<a href="https://comptox.epa.gov/dashboard/chemical/details/${data.dtxsid}" target="_blank" rel="noopener noreferrer">${data.dtxsid}</a>`
                : 'N/A';
        document.getElementById('chem-pubchem-cid').innerHTML = data.pubchem_cid
        ? `<a href="https://pubchem.ncbi.nlm.nih.gov/compound/${data.pubchem_cid}" target="_blank" rel="noopener noreferrer">${data.pubchem_cid}</a>`
        : 'N/A';
        document.getElementById('chem-drugbank-id').innerHTML = data.drugbank_id
        ? `<a href="https://go.drugbank.com/drugs/${data.drugbank_id}" target="_blank" rel="noopener noreferrer">${data.drugbank_id}</a>`
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
            ? `<a href="https://aopwiki.org/aops/${aop.AOP_id }" target="_blank" rel="noopener noreferrer">${'AOP: '+aop.AOP_id }</a>`
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
