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

// Full table topics. The frozen columns are always shown, and a column that matches no
// topic is still available under "All columns".
const CHEM_TABLE_FROZEN = ['Ptox Code', 'Compound Name (User)'];
const CHEM_TABLE_DEFAULT_TOPIC = 'overview';
const CHEM_TABLE_TOPICS = [
    { id: 'overview', label: 'Overview', prefixes: ['Use Category', 'Toxicity Category', 'Vehicle', 'CAS Number', 'Molecular Weight'] },
    { id: 'identifiers', label: 'Identifiers', prefixes: ['Compound Name', 'CAS Number', 'DTXSID', 'PubChem CID', 'DrugBank ID', 'Molecular Formula', 'SMILES', 'INCHIKEY'] },
    { id: 'physchem', label: 'Physico-chemical', hasSources: true, prefixes: ['Molecular Weight', 'Solubility', 'Henry', 'Log Kaw', 'pKa', 'Log Kow', 'Log Dlipw', 'Freely Dissolved', 'Density', 'Boiling Point', 'Melting Point', 'Vapor Pressure'] },
    { id: 'baseline', label: 'Baseline toxicity', prefixes: ['Baseline Toxicity'] },
    { id: 'doses', label: 'Exposure doses', prefixes: ['Exposure Dose'] },
    { id: 'mechanism', label: 'Mechanism & targets', prefixes: ['Mechanism of Action', 'Protein Binding', 'Target Name', 'Adverse Outcome Pathway'] },
    { id: 'all', label: 'All columns' },
];

function isChemColumnVisible(header, topic, showSources) {
    if (CHEM_TABLE_FROZEN.includes(header) || !topic.prefixes) return true;
    if (header.endsWith(' Source') && !(topic.hasSources && showSources)) return false;
    return topic.prefixes.some(prefix => header.startsWith(prefix));
}

function getHiddenChemColumns(headers, topic, showSources) {
    return headers.reduce((hidden, header, index) => {
        if (!isChemColumnVisible(header, topic, showSources)) hidden.push(index);
        return hidden;
    }, []);
}

// The second frozen column has to start where the first one ends
function updateChemFrozenOffset(table) {
    const width = table.column(0).header().offsetWidth;
    document.getElementById('chem_list').style.setProperty('--chem-frozen-left', `${width}px`);
}

function initChemTopics(table, headers) {
    const buttonBar = document.getElementById('chem-topic-buttons');
    const sourcesToggle = document.getElementById('chem-sources-toggle');
    const sourcesInput = document.getElementById('chem-show-sources');
    let currentTopic = CHEM_TABLE_TOPICS.find(topic => topic.id === CHEM_TABLE_DEFAULT_TOPIC);

    const applyTopic = () => {
        const hidden = getHiddenChemColumns(headers, currentTopic, sourcesInput.checked);
        const shown = headers.map((_, index) => index).filter(index => !hidden.includes(index));
        table.columns(hidden).visible(false, false);
        table.columns(shown).visible(true, false);
        // 'page' redraws without sorting again, so no loading screen is shown. Drawing also
        // adds the tooltips of the new cells.
        table.columns.adjust().draw('page');
        updateChemFrozenOffset(table);

        sourcesToggle.hidden = !currentTopic.hasSources;
        buttonBar.querySelectorAll('.chem-topic-btn').forEach(button => {
            const isActive = button.dataset.topic === currentTopic.id;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', isActive);
        });
    };

    buttonBar.innerHTML = '';
    CHEM_TABLE_TOPICS.forEach(topic => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'chem-topic-btn';
        button.dataset.topic = topic.id;
        button.textContent = topic.label;
        button.addEventListener('click', () => {
            currentTopic = topic;
            applyTopic();
        });
        buttonBar.appendChild(button);
    });
    sourcesInput.addEventListener('change', applyTopic);

    table.on('column-sizing.dt', () => updateChemFrozenOffset(table));
    applyTopic();
}

function loadChemList() {
    if (!$.fn.DataTable.isDataTable('#chem-table')) {
        fetch(buildAppPath('/get_chemicals'))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load chemical list: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                const tableHeader = document.getElementById('chem-table-header');
                const tableBody = document.getElementById('chem-table-body');

                // Clear any existing content
                tableHeader.innerHTML = '';
                tableBody.innerHTML = '';

                // Create the table header
                const headers = data.length > 0 ? Object.keys(data[0]) : [];
                headers.forEach(header => {
                    const th = document.createElement('th');
                    th.textContent = header;
                    tableHeader.appendChild(th);
                });

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
                    // Downloads always hold every column, whichever topic is on screen
                    buttons: ['copy', 'csv', 'excel'].map(type => ({
                        extend: type,
                        exportOptions: { columns: () => true }
                    })),
                    scrollY: '65vh', // Vertical scrolling (adjust height as needed)
                    scrollX: true,   // Enable horizontal scrolling
                    scrollCollapse: true, // Allows the table to reduce in height when fewer rows are shown
                    paging: false,
                    autoWidth: false, // Let the table fill the panel when a topic has few columns
                    columnDefs: [
                        { width: '70px', targets: 0 },
                        { width: '100px', targets: '_all' }, // Set the width for all columns
                        // Start on the default topic, so the full width is never drawn
                        {
                            visible: false,
                            targets: getHiddenChemColumns(
                                headers,
                                CHEM_TABLE_TOPICS.find(topic => topic.id === CHEM_TABLE_DEFAULT_TOPIC),
                                false
                            )
                        }
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
                initChemTopics(chem_table, headers);

                let loaderTimeout;

                chem_table.on('order.dt', function () {
                    $('#loader').prop('hidden', false);
                    loaderTimeout = setTimeout(() => {}, 200); // Start timer
                });

                chem_table.on('draw.dt', function () {
                    const hideLoader = () => $('#loader').prop('hidden', true);
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
