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
        document.getElementById('chem-ptx-code').textContent = displayValue(data.ptx_code);
        document.getElementById('chem-name').textContent = displayValue(data.chem_name);
        document.getElementById('chem-common-name').textContent = displayValue(data.chem_name_user);
        document.getElementById('chem-cas').textContent = displayValue(data.casrn);
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
        document.getElementById('chem-smiles').textContent = displayValue(data.smiles);
        document.getElementById('chem-inchi').textContent = displayValue(data.inchikey);
        document.getElementById('chem-use').textContent = displayValue(data.use_class);
        document.getElementById('chem-tox').textContent = displayValue(data.tox_class);

        document.getElementById('chem-mw').textContent = displayValue(data.mw_g_mol);
        document.getElementById('chem-solubility').textContent = displayValue(data.solubility_h2o_mol_liter);
        document.getElementById('chem-source-solubility').textContent = displayValue(data.source_solubility_h2o);
        document.getElementById('chem-henry').textContent = displayValue(data.henry_coefficient_atm_m3_mol);
        document.getElementById('chem-source-henry').textContent = displayValue(data.source_henry);
        document.getElementById('chem-log-kaw').textContent = displayValue(data.log_kaw_kh_rt);
        document.getElementById('chem-source-kaw').textContent = displayValue(data.source_kaw);
        document.getElementById('chem-log-kow').textContent = displayValue(data.log_kow_liter_liter);
        document.getElementById('chem-source-kow').textContent = displayValue(data.source_kow);
        document.getElementById('chem-pka-acid').textContent = displayValue(data.pka_acid);
        document.getElementById('chem-source-pka-acid').textContent = displayValue(data.source_pka);
        document.getElementById('chem-pka-base').textContent = displayValue(data.pka_base);
        document.getElementById('chem-source-pka-base').textContent = displayValue(data.source_pka);
        document.getElementById('chem-log-dlipw').textContent = displayValue(data.log_dlipw_ph74_liter_liter);
        document.getElementById('chem-source-dlipw').textContent = displayValue(data.source_dlipw);
        document.getElementById('chem-fdf').textContent = displayValue(data.freely_dissolved_fraction);
        document.getElementById('chem-density').textContent = displayValue(data.density_kg_liter);
        document.getElementById('chem-source-density').textContent = displayValue(data.source_density);
        document.getElementById('chem-boiling').textContent = displayValue(data.boiling_point);
        document.getElementById('chem-source-boiling').textContent = displayValue(data.source_boiling_point);
        document.getElementById('chem-melting').textContent = displayValue(data.melting_point);
        document.getElementById('chem-source-melting').textContent = displayValue(data.source_melting_point);
        document.getElementById('chem-vapor-pressure').textContent = displayValue(data.vapor_pressure);
        document.getElementById('chem-source-vapor-pressure').textContent = displayValue(data.source_vapor_pressure);
        document.getElementById('base-tox-celegans').textContent = displayValue(data.baseline_celegans);
        document.getElementById('base-tox-drerio').textContent = displayValue(data.baseline_drerio);
        document.getElementById('base-tox-dmagna').textContent = displayValue(data.baseline_dmagna);
        document.getElementById('base-tox-dmelanogaster').textContent = displayValue(data.baseline_dmelanogaster);
        document.getElementById('base-tox-cells').textContent = displayValue(data.baseline_cells);
        document.getElementById('base-tox-cells-generic').textContent = displayValue(data.baseline_cells_generic_micromole_liter_free_ec10);
        document.getElementById('base-tox-xlaevis').textContent = displayValue(data.baseline_xlaevis);
        document.getElementById('moa-drugbank').textContent = displayValue(data.moa_drugbank);
        document.getElementById('moa-t3db').textContent = displayValue(data.moa_t3db);
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
