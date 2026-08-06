function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].classList.remove("active");
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    // Initialize the network only when the tab is activated
    if (tabName === 'network_view') {
        initializeCytoscape(selectedChemFromURL);
    } else if (tabName === 'chem_list') {
        loadChemList();
    }
}

function showTable(tableId) {
    // Hide tables
    document.getElementById('phys-properties-table').style.display = 'none';
    document.getElementById('baseline-tox-table').style.display = 'none';
    document.getElementById('aop-table').style.display = 'none';
    document.getElementById('targets-table').style.display = 'none';
    document.getElementById('moa-table').style.display = 'none';

    // Remove 'active' class from buttons
    document.querySelectorAll('.table-tab-btn').forEach(button => {
        button.classList.remove('active');
    });

    // Show the selected table
    document.getElementById(tableId).style.display = 'block';

    // Add 'active' class to the clicked button
    if (tableId === 'phys-properties-table') {
        document.querySelector('.table-tab-btn:nth-child(1)').classList.add('active');
    } else if (tableId === 'baseline-tox-table') {
        document.querySelector('.table-tab-btn:nth-child(2)').classList.add('active');
    } else if (tableId === 'aop-table') {
        document.querySelector('.table-tab-btn:nth-child(3)').classList.add('active');
    } else if (tableId === 'targets-table') {
        document.querySelector('.table-tab-btn:nth-child(4)').classList.add('active');
    } else if (tableId === 'moa-table') {
        document.querySelector('.table-tab-btn:nth-child(5)').classList.add('active');
    }
}

function initializeTabs() {
    document.querySelectorAll('.tablinks').forEach(button => {
        button.addEventListener('click', function(event) {
            openTab(event, this.dataset.tabTarget);
        });
    });
    document.querySelector('.tablinks').click();
}

function initializeTableTabs() {
    document.querySelectorAll('.table-tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            showTable(this.dataset.tableTarget);
        });
    });
}

function initializeClassificationButtons() {
    document.querySelectorAll('.classification-btn').forEach(button => {
        button.addEventListener('click', function() {
            loadBasicNetworkAndClassify(this.dataset.classification);
        });
    });
}

function initializeChemicalSelectControl() {
    $('#chem-select').on('change', function() {
        redirectToChemical(this.value);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeTableTabs();
    initializeClassificationButtons();
    initializeChemicalSelectControl();
    initializeNetworkControls();
    initializeDownloadControls();
    initializeGraphWheelScrolling();

    // Add event listener for the reset button
    document.getElementById('reset-button').addEventListener('click', resetNetwork);
});
