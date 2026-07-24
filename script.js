//load google script file
const SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbz5ZuLfoXWVE8hoMukorze8-iWlFEE-IYh_UXXrkJE-HNSxuteB5q0wrBZkOesPnOnAWg/exec";

let allClasses = [];
let selectedClassForRegistration = null;
let adminSelectedClass = null;
let emailMessages = {};
let emailTemplates = {};
let currentEmailMessageKey = "confirmation";
let currentEmailClassScope = null; // null = Global/Default, else {branch, name}

// class catalog shown on registration page 
async function loadClasses() {
    const catalog = document.getElementById("classCatalog");

    if (!catalog) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        allClasses = await response.json();

        displayClassCatalog();
        populateBranchFilter();
    } catch (error) {
        console.error(error);
        catalog.innerHTML = "<p>Could not load classes. Please try again later.</p>";
    }
}

//escapes a value for safe use inside an HTML attribute (just enough to
//keep a branch name containing a quote from breaking the markup)
function escapeAttribute(value) {
    return String(value == null ? "" : value).replace(/"/g, "&quot;");
}

//builds the class-card markup for one branch's list of classes
function buildClassCardsHtml(branchClasses) {
    let html = "";

    for (let j = 0; j < branchClasses.length; j++) {
        const classItem = branchClasses[j];

        html += `
            <div class="class-card">
                <h3>${classItem.name}</h3>

                ${Number(classItem.seatsLeft) <= 0 ? `<div class="waitlist-badge">Full • Waitlist: ${Number(classItem.waitlistCount) || 0}</div>` : ""}

                <p>${classItem.description}</p>

                <p><strong>Date:</strong> ${formatDisplayDate(classItem.date)}</p>
                <p><strong>Time:</strong> ${classItem.time}</p>
                <p><strong>Instructor:</strong> ${classItem.teacher}</p>

                <p class="${String(classItem.lunch || "").toLowerCase() === 'yes' ? 'lunch-provided' : 'no-lunch'}">
                    ${String(classItem.lunch || "").toLowerCase() === 'yes' ? '🍕 Lunch Provided' : '🚫 No Lunch Provided'}
                </p>

                <p><strong>Seats Left:</strong> ${classItem.seatsLeft} of ${classItem.capacity}</p>

                <a
                    class="map-button"
                    href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(classItem.address)}"
                    target="_blank">
                    View Branch Map
                </a>

                <button type="button" onclick='openRegistrationModal(${JSON.stringify(classItem)})'>
                    Register
                </button>
            </div>
        `;
    }

    return html;
}

//which branch's classes are currently shown below the tile grid
//which branch's classes are currently shown expanded
let expandedBranch = null;

function displayClassCatalog() {
    const catalog = document.getElementById("classCatalog");

    const branches = [
        ...new Set(
            allClasses
                .map(c => (c.branch || "").trim())
                .filter(Boolean)
        )
    ].sort(function(a, b) {
        return a.localeCompare(b);
    });

    if (branches.length === 0) {
        catalog.innerHTML = `
            <div class="empty-state">
                <h2>No workshops are currently available.</h2>
                <p>Please check back soon for upcoming classes.</p>
            </div>
        `;
        return;
    }

    const branchGroups = branches.map(function (branch) {
        const branchClasses =
            allClasses
                .filter(c => (c.branch || "").trim() === branch)
                .sort(function(a, b) {
                    return (a.name || "").trim().localeCompare(
                        (b.name || "").trim()
                    );
                });

        return {
            branch: branch,
            classes: branchClasses,
            address: (branchClasses[0] && branchClasses[0].address) || ""
        };
    });

    //the previously expanded branch may have been renamed/deleted since
    //the last refresh - if so, just collapse
    if (expandedBranch && !branchGroups.some(function (g) { return g.branch === expandedBranch; })) {
        expandedBranch = null;
    }

    let html = "";
    const expandedGroup = branchGroups.find(function (g) { return g.branch === expandedBranch; });

    if (expandedGroup) {
        html += `
            <div class="branch-tile branch-tile-expanded" data-branch="${escapeAttribute(expandedGroup.branch)}">
                <div class="branch-tile-summary-clickable" onclick="toggleBranchTile(this.closest('.branch-tile').dataset.branch)">
                    <div class="branch-tile-heading">
                        <h3>${expandedGroup.branch}</h3>
                        <span class="branch-tile-arrow">&#9660;</span>
                    </div>
                    ${expandedGroup.address ? `<p class="branch-tile-address">${expandedGroup.address}</p>` : ""}
                    <p class="branch-tile-count">${expandedGroup.classes.length} class${expandedGroup.classes.length === 1 ? "" : "es"} available</p>
                </div>
                <div class="branch-grid">
                    ${buildClassCardsHtml(expandedGroup.classes)}
                </div>
            </div>
        `;
    }

    const collapsedGroups = branchGroups.filter(function (g) { return g.branch !== expandedBranch; });

    if (collapsedGroups.length > 0) {
        html += `<div class="branch-tiles">`;

        collapsedGroups.forEach(function (group) {
            html += `
                <div
                    class="branch-tile"
                    data-branch="${escapeAttribute(group.branch)}"
                    onclick="toggleBranchTile(this.dataset.branch)">
                    <div class="branch-tile-heading">
                        <h3>${group.branch}</h3>
                        <span class="branch-tile-arrow">&#9660;</span>
                    </div>
                    ${group.address ? `<p class="branch-tile-address">${group.address}</p>` : ""}
                    <p class="branch-tile-count">${group.classes.length} class${group.classes.length === 1 ? "" : "es"} available</p>
                </div>
            `;
        });

        html += `</div>`;
    }

    catalog.innerHTML = html;
}

//expands the clicked branch tile (it becomes a full-width card with its
//classes nested inside, pushing the other tiles below it), or collapses
//it if it was already open
function toggleBranchTile(branch) {
    expandedBranch = (expandedBranch === branch) ? null : branch;
    displayClassCatalog();
}

//pulls up branch class info in block
function openRegistrationModal(classItem) {
    selectedClassForRegistration = classItem;

    document.getElementById("modalClassTitle").innerText =
        classItem.name;

    document.getElementById("modalClassDetails").innerHTML =
        "<p><strong>Branch:</strong> " + classItem.branch + "</p>" +
        "<p><strong>Date:</strong> " + formatDisplayDate(classItem.date) + "</p>" +
        "<p><strong>Time:</strong> " + classItem.time + "</p>" +
        "<p><strong>Instructor:</strong> " + classItem.teacher + "</p>" +
        "<p><strong>Lunch Provided:</strong> " + classItem.lunch + "</p>" +
        "<p><strong>Seats Left:</strong> " + classItem.seatsLeft + " of " + classItem.capacity + "</p>" +
        "<p><strong>Description:</strong><br>" + classItem.description + "</p>";

    document.getElementById("registrationModal").style.display = "block";
}

//close class detail block after clicking "X"
function closeRegistrationModal() {
    document.getElementById("registrationModal").style.display = "none";

    selectedClassForRegistration = null;

    document.getElementById("name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("confirmEmail").value = "";
}

//user fills in personal informatin to register for selected class
function registerEmployee() {
    if (!selectedClassForRegistration) {
        alert("Please select a class.");
        return;
    }

    const selectedClass = selectedClassForRegistration;

    
    //user enters inputs 
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const confirmEmail = document.getElementById("confirmEmail").value.trim();
    const spotsRequested =  Number(document.getElementById("spotsRequested").value) || 1;

    //makes sure form isnt submitted with missing info
    if (name === ""){
        alert("Please enter your name.");
        return;
    }

    if (email === ""){
        alert("Please enter your email");
        return;
    }
    
    
  if (email !== confirmEmail){
      alert("Emails don not match. Please try again");
      return;
  }
    
    
    if (
    Number(selectedClass.seatsLeft) > 0 &&
    spotsRequested > Number(selectedClass.seatsLeft)
) {
    alert("There are only " + selectedClass.seatsLeft + " seats left.");
    return;
}

    if (Number(selectedClass.seatsLeft) <= 0) {
        alert("This class is full. You will be added to the waitlist.");
    }

    //stores employee information to be used in other functions 
    const employee = {
        type: "registration",
        name: name,
        email: email,
        branch: selectedClass.branch,
        trainingClass: selectedClass.name,
        date: formatDisplayDate(selectedClass.date),
        time: selectedClass.time,
        address: selectedClass.address,
        description: selectedClass.description,
        teacher: selectedClass.teacher,
        lunch: selectedClass.lunch,
        capacity: selectedClass.capacity,
        spotsRequested: spotsRequested,
    };

    
    //stores infoarmtion on computer using the script as a "backend"
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(employee)
    });

    //loads confirmation page after 1.5 seconds 
    setTimeout(function () {
        window.location.replace("Confirmation.html");
    }, 1500);
}

//grabbing features from admin create class page
function addClass() {
    const branch = document.getElementById("adminBranch").value.trim();
    const className = document.getElementById("adminClass").value.trim();
    const date = document.getElementById("adminDate").value.trim();
    const time = document.getElementById("adminTime").value.trim();
    const description = document.getElementById("adminDescription").value.trim();
    const address = document.getElementById("adminAddress").value.trim();
    const teacher = document.getElementById("adminTeacher").value.trim();
    const lunch = document.getElementById("adminLunch").value.trim();
    const capacity = document.getElementById("adminCapacity").value.trim();

    //makes ure no inputs are left empty
    if (branch === "" || className === "" || date === "" || time === "") {
        alert("Please fill out branch, class name, date, and time.");
        return;
    }

    if (!isValidFutureDate(date)) {
        alert("Please enter a valid date (MM/DD/YYYY) that is today or in the future.");
        return;
    }

    //groups together class info input by the admin throug hadmin page 
    const newClass = {
        type: "class",
        branch: branch,
        name: className,
        date: date,
        time: time,
        description: description,
        address: address,
        teacher: teacher,
        lunch: lunch,
        capacity: capacity
    };

    //grabbing from google script and pushing info to the google sheet 
    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(newClass)
    });

//clear form once class is added and is on google sheet
    setTimeout(function () {
        alert("Class added. Please see updated Google Sheet");
        clearAdminForm();
        loadAdminClasses();
        loadSheetNames();
    }, 1500);
}

//parses CSV text (handling quoted fields with commas/newlines) into an
//array of rows, each row an array of cell strings
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            if (char === "\r" && text[i + 1] === "\n") {
                i++;
            }

            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    return rows.filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ""; });
    });
}

//reads the chosen CSV file and adds one class per valid row, reusing the
//same "type: class" POST that the single Add Class form uses
function importClassesFromCSV() {
    const fileInput = document.getElementById("classCsvFile");

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please choose a CSV file first.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
        const rows = parseCSV(event.target.result);

        if (rows.length < 2) {
            alert("That CSV doesn't have any data rows.");
            return;
        }

        const headers = rows[0].map(function (h) {
            return h.trim().toLowerCase();
        });

        const columnIndex = {
            branch: headers.indexOf("branch"),
            name: headers.indexOf("class name"),
            date: headers.indexOf("date"),
            time: headers.indexOf("time"),
            description: headers.indexOf("description"),
            teacher: headers.indexOf("instructor"),
            capacity: headers.indexOf("capacity"),
            lunch: headers.indexOf("lunch"),
            address: headers.indexOf("address")
        };

        if (
            columnIndex.branch === -1 || columnIndex.name === -1 ||
            columnIndex.date === -1 || columnIndex.time === -1
        ) {
            alert("The CSV must include at least Branch, Class Name, Date, and Time columns.");
            return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];

            const branch = (row[columnIndex.branch] || "").trim();
            const className = (row[columnIndex.name] || "").trim();
            const date = (row[columnIndex.date] || "").trim();
            const time = (row[columnIndex.time] || "").trim();

            if (!branch || !className || !date || !time || !isValidFutureDate(date)) {
                skippedCount++;
                continue;
            }

            const newClass = {
                type: "class",
                branch: branch,
                name: className,
                date: date,
                time: time,
                description: columnIndex.description !== -1 ? (row[columnIndex.description] || "").trim() : "",
                address: columnIndex.address !== -1 ? (row[columnIndex.address] || "").trim() : "",
                teacher: columnIndex.teacher !== -1 ? (row[columnIndex.teacher] || "").trim() : "",
                lunch: columnIndex.lunch !== -1 ? (row[columnIndex.lunch] || "").trim() : "",
                capacity: columnIndex.capacity !== -1 ? (row[columnIndex.capacity] || "").trim() : ""
            };

            fetch(SCRIPT_URL, {
                method: "POST",
                mode: "no-cors",
                body: JSON.stringify(newClass)
            });

            importedCount++;
        }

        fileInput.value = "";

        setTimeout(function () {
            alert(
                "Imported " + importedCount + " class(es)." +
                (skippedCount > 0
                    ? " Skipped " + skippedCount + " row(s) with missing/invalid data (Branch, Class Name, Date, and Time are required, and Date must be today or later)."
                    : "")
            );

            loadAdminClasses();
            loadSheetNames();
        }, 2000);
    };

    reader.readAsText(fileInput.files[0]);
}

//loads existing classes on admin page to pick from to edit/delte/download
async function loadAdminClasses() {
    const existingClassDropdown = document.getElementById("existingClass");

    if (!existingClassDropdown) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL);
        allClasses = await response.json();

        existingClassDropdown.innerHTML =
            '<option value="">Select Existing Class</option>';

        for (let i = 0; i < allClasses.length; i++) {
            const option = document.createElement("option");

            option.value = JSON.stringify(allClasses[i]);
            option.textContent =
                allClasses[i].branch + " - " + allClasses[i].name;

            existingClassDropdown.appendChild(option);
        }

        populateEmailClassSelect();
    } catch (error) {
        console.error(error);
        alert("Could not load admin classes.");
    }
}

//populates the "Apply To" dropdown in the Email Messages section with
//"Global" plus every existing class, so messages/templates can be scoped
//to one specific class instead of applying everywhere
function populateEmailClassSelect() {
    const select = document.getElementById("emailClassSelect");

    if (!select) {
        return;
    }

    const previousValue = select.value;

    select.innerHTML = '<option value="">Global (All Classes / Default)</option>';

    for (let i = 0; i < allClasses.length; i++) {
        const option = document.createElement("option");

        option.value = JSON.stringify({
            branch: allClasses[i].branch,
            name: allClasses[i].name
        });

        option.textContent = allClasses[i].branch + " - " + allClasses[i].name;

        select.appendChild(option);
    }

    if (previousValue) {
        select.value = previousValue;
    }
}

//pull classes from google sheet using scripts to show for editing
function loadClassForEditing() {
    const existingClassDropdown = document.getElementById("existingClass");
    const editFieldsContainer = document.getElementById("editFieldsContainer");

    //when there are no classes existing
    if (!existingClassDropdown || existingClassDropdown.value === "") {
        adminSelectedClass = null;

        if (editFieldsContainer) {
            editFieldsContainer.style.display = "none";
        }

        return;
    }

    adminSelectedClass = JSON.parse(existingClassDropdown.value);

    document.getElementById("editBranch").value =
        adminSelectedClass.branch || "";

    document.getElementById("editClass").value =
        adminSelectedClass.name || "";

    document.getElementById("editDate").value =
        formatDisplayDate(adminSelectedClass.date);

    document.getElementById("editTime").value =
        adminSelectedClass.time || "";

    document.getElementById("editDescription").value =
        adminSelectedClass.description || "";

    document.getElementById("editAddress").value =
        adminSelectedClass.address || "";

    document.getElementById("editTeacher").value =
        adminSelectedClass.teacher || "";

    document.getElementById("editLunch").value =
        adminSelectedClass.lunch || "";

    document.getElementById("editCapacity").value =
        adminSelectedClass.capacity || "";

    if (editFieldsContainer) {
        editFieldsContainer.style.display = "block";
    }

    loadRegistrationsForSelectedClass();
}

//update info on google sheet 
function updateClass() {
    if (!adminSelectedClass) {
        alert("Please select a class to update.");
        return;
    }

    const updatedClass = {
        type: "updateClass",
        rowNumber: adminSelectedClass.rowNumber,
        branch: document.getElementById("editBranch").value.trim(),
        name: document.getElementById("editClass").value.trim(),
        date: document.getElementById("editDate").value.trim(),
        time: document.getElementById("editTime").value.trim(),
        description: document.getElementById("editDescription").value.trim(),
        address: document.getElementById("editAddress").value.trim(),
        teacher: document.getElementById("editTeacher").value.trim(),
        lunch: document.getElementById("editLunch").value.trim(),
        capacity: document.getElementById("editCapacity").value.trim()
    };

    if (!isValidFutureDate(updatedClass.date)) {
        alert("Please enter a valid date (MM/DD/YYYY) that is today or in the future.");
        return;
    }

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedClass)
    });

    setTimeout(function () {
        alert("Class updated.");

        adminSelectedClass = null;
        clearEditFields();

        const existingClassDropdown = document.getElementById("existingClass");

        if (existingClassDropdown) {
            existingClassDropdown.selectedIndex = 0;
        }

        loadAdminClasses();
        loadSheetNames();

        const sheetSelect = document.getElementById("registrationsSheetSelect");

        if (sheetSelect) {
            loadSheetTable(sheetSelect.value);
        }
    }, 1500);
}

//delte a class. remove from class options and google sheet. removes created class tab
function deleteClass() {
    if (!adminSelectedClass) {
        alert("Please select a class to delete.");
        return;
    }

    const confirmDelete = confirm(
        "Are you sure you want to cancel/delete this class?"
    );

    if (!confirmDelete) {
        return;
    }

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            type: "deleteClass",
            rowNumber: adminSelectedClass.rowNumber,
            branch: adminSelectedClass.branch,
            name: adminSelectedClass.name
        })
    });

    //remove the class from the dropdown right away instead of waiting on a refresh
    const existingClassDropdown = document.getElementById("existingClass");

    if (existingClassDropdown && existingClassDropdown.selectedIndex > 0) {
        existingClassDropdown.options[existingClassDropdown.selectedIndex].remove();
        existingClassDropdown.selectedIndex = 0;
    }

    allClasses = allClasses.filter(function (c) {
        return !(
            c.branch === adminSelectedClass.branch &&
            c.name === adminSelectedClass.name
        );
    });

    adminSelectedClass = null;
    clearEditFields();

    //re-sync with the sheet a moment later in case anything else changed
    setTimeout(function () {
        alert("Class cancelled/deleted.");
        loadAdminClasses();
        loadSheetNames();
    }, 1500);
}


//download CSV file 
function downloadRoster() {

    if (!adminSelectedClass) {
        alert("Please select a class first.");
        return;
    }

    const sheetName =
        cleanSheetName(
            adminSelectedClass.branch +
            " - " +
            adminSelectedClass.name
        );

    const rosterUrl =
        SCRIPT_URL +
        "?downloadRoster=true&sheetName=" +
        encodeURIComponent(sheetName);

    window.open(rosterUrl, "_blank");
}


function cleanSheetName(name) {
    return name
        .replace(/[\\\/\?\*\[\]\:]/g, "")
        .substring(0, 99);
}

//clears admin inputs after functions are run 
function clearAdminForm() {
    const fields = [
        "adminBranch",
        "adminClass",
        "adminDate",
        "adminTime",
        "adminDescription",
        "adminAddress",
        "adminTeacher",
        "adminLunch",
        "adminCapacity"
    ];

    for (let i = 0; i < fields.length; i++) {
        const field = document.getElementById(fields[i]);

        if (field) {
            field.value = "";
        }
    }
}

//clears and hides the edit-existing-class fields after update/delete
function clearEditFields() {
    const fields = [
        "editBranch",
        "editClass",
        "editDate",
        "editTime",
        "editDescription",
        "editAddress",
        "editTeacher",
        "editLunch",
        "editCapacity"
    ];

    for (let i = 0; i < fields.length; i++) {
        const field = document.getElementById(fields[i]);

        if (field) {
            field.value = "";
        }
    }

    const editFieldsContainer = document.getElementById("editFieldsContainer");

    if (editFieldsContainer) {
        editFieldsContainer.style.display = "none";
    }
}



//displays the date in a mm/dd/year format
function formatDisplayDate(dateString) {
    const date = new Date(dateString);

    if (isNaN(date)) {
        return dateString || "";
    }

    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();

    return month + "/" + day + "/" + year;
}

//checks that a date string (e.g. "MM/DD/YYYY") parses to a real date
//that is today or later
function isValidFutureDate(dateString) {
    const parsed = new Date(dateString);

    if (isNaN(parsed)) {
        return false;
    }

    const today = new Date();

    today.setHours(0, 0, 0, 0);
    parsed.setHours(0, 0, 0, 0);

    return parsed >= today;
}

//filters branches by the selected choice from dropdown
function populateBranchFilter() {
    const branchFilter = document.getElementById("branchFilter");

    if (!branchFilter) {
        return;
    }

    const branches = [
        ...new Set(
            allClasses
                .map(c => (c.branch || "").trim())
                .filter(Boolean)
        )
    ].sort();

    branchFilter.innerHTML =
        '<option value="">All Branches</option>';

    for (let i = 0; i < branches.length; i++) {
        const option = document.createElement("option");

        option.value = branches[i];
        option.textContent = branches[i];

        branchFilter.appendChild(option);
    }
}

//pull up classess only from selected branch
function filterByBranch() {
    const selectedBranch =
        document.getElementById("branchFilter").value;

    const branchTiles =
        document.querySelectorAll(".branch-tile");

    branchTiles.forEach(function(tile) {
        const branchName = tile.dataset.branch || "";

        if (
            selectedBranch === "" ||
            branchName === selectedBranch
        ) {
            tile.style.display = "";
        } else {
            tile.style.display = "none";
        }
    });

   
}


//loads classes on registration page and form on the admin page
function startPage() {
    loadClasses();
    loadAdminClasses();
    loadSheetNames();
    loadEmailMessages();
}

//placeholders available in a custom full-HTML template for each email type
const EMAIL_PLACEHOLDERS = {
    confirmation: ["name", "class", "branch", "address", "date", "time", "teacher", "lunch", "description", "spotsReserved", "cancelLink"],
    waitlist: ["name", "class", "branch", "date", "time", "spotsRequested"],
    removal: ["name", "class", "branch"],
    cancellation: ["name", "class", "branch"],
    update: ["name", "class", "branch", "address", "date", "time", "teacher", "lunch"],
    classCancelled: ["name", "class", "branch"]
};

//generates the current built-in layout as a starting point for the custom
//HTML template box, so the admin edits something real instead of a blank
//textarea. The blurb text is baked in as plain text since the custom
//template replaces it entirely once in use.
const DEFAULT_HTML_TEMPLATES = {
    confirmation: function (messageText) {
        return "<div style='font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;'>\n" +
            "<div style='max-width:650px; margin:auto; background:white; padding:35px; border-radius:14px; border:1px solid #e5e7eb;'>\n\n" +
            "<h1 style='color:#b7342b; text-align:center; margin-top:0;'>Workshop Registration Confirmed</h1>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Hi {{name}},</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>" + messageText + "</p>\n\n" +
            "<div style='background:#f9f9f9; border-left:6px solid #9b0035; padding:18px; border-radius:8px; margin:25px 0;'>\n" +
            "<p style='margin:0; font-size:16px; color:#374151;'>\n" +
            "<strong>Class:</strong> {{class}}<br>\n" +
            "<strong>Branch:</strong> {{branch}}<br>\n" +
            "<strong>Address:</strong> {{address}}<br>\n" +
            "<strong>Date:</strong> {{date}}<br>\n" +
            "<strong>Time:</strong> {{time}}<br>\n" +
            "<strong>Instructor:</strong> {{teacher}}<br>\n" +
            "<strong>Lunch Provided:</strong> {{lunch}}<br>\n" +
            "<strong>Spots Reserved:</strong> {{spotsReserved}}\n" +
            "</p>\n" +
            "</div>\n\n" +
            "<p style='font-size:16px; color:#374151;'><strong>Description:</strong><br>{{description}}</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>A calendar file is attached.</p>\n\n" +
            "<p style='text-align:center;'>\n" +
            "<a href='{{cancelLink}}' style='background:#9b0035; color:white; padding:12px 20px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;'>Cancel Registration</a>\n" +
            "</p>\n\n" +
            "<div style='text-align:center; margin-top:30px;'>\n" +
            "<img src='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/dbc-logo.png' alt='DBC Logo' style='max-width:180px; height:auto;'>\n" +
            "</div>\n\n" +
            "</div>\n</div>";
    },
    waitlist: function (messageText) {
        return "<div style='font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;'>\n" +
            "<div style='max-width:650px; margin:auto; background:white; padding:35px; border-radius:14px; border:1px solid #e5e7eb;'>\n\n" +
            "<h1 style='color:#b7342b; text-align:center; margin-top:0;'>You're on the Waitlist</h1>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Hi {{name}},</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>" + messageText + "</p>\n\n" +
            "<div style='background:#f9f9f9; border-left:6px solid #9b0035; padding:18px; border-radius:8px; margin:25px 0;'>\n" +
            "<p style='margin:0; font-size:16px; color:#374151;'>\n" +
            "<strong>Class:</strong> {{class}}<br>\n" +
            "<strong>Branch:</strong> {{branch}}<br>\n" +
            "<strong>Date:</strong> {{date}}<br>\n" +
            "<strong>Time:</strong> {{time}}<br>\n" +
            "<strong>Spots Requested:</strong> {{spotsRequested}}\n" +
            "</p>\n" +
            "</div>\n\n" +
            "<div style='text-align:center; margin-top:30px;'>\n" +
            "<img src='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/dbc-logo.png' alt='DBC Logo' style='max-width:180px; height:auto;'>\n" +
            "</div>\n\n" +
            "</div>\n</div>";
    },
    removal: function (messageText) {
        return "<div style='font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;'>\n" +
            "<div style='max-width:650px; margin:auto; background:white; padding:35px; border-radius:14px; border:1px solid #e5e7eb;'>\n\n" +
            "<h1 style='color:#b7342b; text-align:center; margin-top:0;'>Workshop Registration Removed</h1>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Hi {{name}},</p>\n\n" +
            "<div style='background:#f9f9f9; border-left:6px solid #9b0035; padding:18px; border-radius:8px; margin:25px 0;'>\n" +
            "<p style='font-size:16px; color:#374151; margin:0;'>" + messageText + "</p>\n" +
            "<br>\n" +
            "<p style='font-size:16px; color:#374151; margin:0;'>\n" +
            "<strong>Class:</strong> {{class}}<br>\n" +
            "<strong>Branch:</strong> {{branch}}\n" +
            "</p>\n" +
            "</div>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Thank you.</p>\n\n" +
            "<div style='text-align:center; margin-top:30px;'>\n" +
            "<img src='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/dbc-logo.png' alt='DBC Logo' style='max-width:180px; height:auto;'>\n" +
            "</div>\n\n" +
            "</div>\n</div>";
    },
    cancellation: function (messageText) {
        return "<div style='font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;'>\n" +
            "<div style='max-width:650px; margin:auto; background:white; padding:35px; border-radius:14px; border:1px solid #e5e7eb;'>\n\n" +
            "<h1 style='color:#b7342b; text-align:center; margin-top:0;'>Workshop Registration Cancelled</h1>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Hi {{name}},</p>\n\n" +
            "<div style='background:#f9f9f9; border-left:6px solid #9b0035; padding:18px; border-radius:8px; margin:25px 0;'>\n" +
            "<p style='font-size:16px; color:#374151; margin:0;'>Your registration for <strong>{{class}}</strong> at <strong>{{branch}}</strong> has been cancelled.</p>\n" +
            "</div>\n\n" +
            "<p style='font-size:16px; color:#374151;'>" + messageText + "</p>\n\n" +
            "<p style='text-align:center;'>\n" +
            "<a href='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/' style='background:#9b0035; color:white; padding:12px 20px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;'>View Available Classes</a>\n" +
            "</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Thank you.</p>\n\n" +
            "<div style='text-align:center; margin-top:30px;'>\n" +
            "<img src='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/dbc-logo.png' alt='DBC Logo' style='max-width:180px; height:auto;'>\n" +
            "</div>\n\n" +
            "</div>\n</div>";
    },
    update: function (messageText) {
        return "<div style='font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;'>\n" +
            "<div style='max-width:650px; margin:auto; background:white; padding:35px; border-radius:14px; border:1px solid #e5e7eb;'>\n\n" +
            "<h1 style='color:#b7342b; text-align:center; margin-top:0;'>Workshop Class Updated</h1>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Hi {{name}},</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>" + messageText + "</p>\n\n" +
            "<div style='background:#f9f9f9; border-left:6px solid #9b0035; padding:18px; border-radius:8px; margin:25px 0;'>\n" +
            "<p style='margin:0; font-size:16px; color:#374151;'>\n" +
            "<strong>Class:</strong> {{class}}<br>\n" +
            "<strong>Branch:</strong> {{branch}}<br>\n" +
            "<strong>Date:</strong> {{date}}<br>\n" +
            "<strong>Time:</strong> {{time}}<br>\n" +
            "<strong>Instructor:</strong> {{teacher}}<br>\n" +
            "<strong>Lunch Provided:</strong> {{lunch}}<br>\n" +
            "<strong>Address:</strong> {{address}}\n" +
            "</p>\n" +
            "</div>\n\n" +
            "<p style='text-align:center;'>\n" +
            "<a href='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/' style='background:#9b0035; color:white; padding:12px 20px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;'>View Registration Portal</a>\n" +
            "</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Thank you.</p>\n\n" +
            "<div style='text-align:center; margin-top:30px;'>\n" +
            "<img src='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/dbc-logo.png' alt='DBC Logo' style='max-width:180px; height:auto;'>\n" +
            "</div>\n\n" +
            "</div>\n</div>";
    },
    classCancelled: function (messageText) {
        return "<div style='font-family: Arial, sans-serif; background:#f4f4f4; padding:30px;'>\n" +
            "<div style='max-width:650px; margin:auto; background:white; padding:35px; border-radius:14px; border:1px solid #e5e7eb;'>\n\n" +
            "<h1 style='color:#b7342b; text-align:center; margin-top:0;'>Workshop Cancelled</h1>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Hi {{name}},</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>" + messageText + "</p>\n\n" +
            "<div style='background:#f9f9f9; border-left:6px solid #9b0035; padding:18px; border-radius:8px; margin:25px 0;'>\n" +
            "<p style='margin:0; font-size:16px; color:#374151;'>\n" +
            "<strong>Class:</strong> {{class}}<br>\n" +
            "<strong>Branch:</strong> {{branch}}\n" +
            "</p>\n" +
            "</div>\n\n" +
            "<p style='text-align:center;'>\n" +
            "<a href='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/' style='background:#9b0035; color:white; padding:12px 20px; text-decoration:none; border-radius:8px; display:inline-block; font-weight:bold;'>View Available Classes</a>\n" +
            "</p>\n\n" +
            "<p style='font-size:16px; color:#374151;'>Thank you.</p>\n\n" +
            "<div style='text-align:center; margin-top:30px;'>\n" +
            "<img src='https://slstonehocker.github.io/DBC-Winter-Workshop-Iteration-2-/dbc-logo.png' alt='DBC Logo' style='max-width:180px; height:auto;'>\n" +
            "</div>\n\n" +
            "</div>\n</div>";
    }
};

//fake but realistic values used to render the live preview, since the
//actual name/date/etc. are only known at send time
const EMAIL_PREVIEW_SAMPLE_DATA = {
    confirmation: {
        name: "Jane Doe", class: "Lighting Design", branch: "Denver",
        address: "123 Main St, Denver, CO", date: "8/15/2026", time: "9-11 AM",
        teacher: "John Smith", lunch: "Yes",
        description: "Learn the fundamentals of residential and commercial lighting design.",
        spotsReserved: "1", cancelLink: "#"
    },
    waitlist: {
        name: "Jane Doe", class: "Lighting Design", branch: "Denver",
        date: "8/15/2026", time: "9-11 AM", spotsRequested: "1"
    },
    removal: { name: "Jane Doe", class: "Lighting Design", branch: "Denver" },
    cancellation: { name: "Jane Doe", class: "Lighting Design", branch: "Denver" },
    update: {
        name: "Jane Doe", class: "Lighting Design", branch: "Denver",
        address: "123 Main St, Denver, CO", date: "8/15/2026", time: "9-11 AM",
        teacher: "John Smith", lunch: "Yes"
    },
    classCancelled: { name: "Jane Doe", class: "Lighting Design", branch: "Denver" }
};

//replaces {{token}} placeholders in a template with sample preview values
function renderPreviewTemplate(template, values) {
    return template.replace(/\{\{(\w+)\}\}/g, function (match, token) {
        return values[token] !== undefined ? values[token] : match;
    });
}

//renders the current message/template (whichever is active) into the live
//preview iframe using sample placeholder data, so the admin can see what
//the real email will look like as they type
function updateEmailTemplatePreview() {
    const previewFrame = document.getElementById("emailPreviewFrame");

    if (!previewFrame) {
        return;
    }

    const messageArea = document.getElementById("emailMessageText");
    const templateArea = document.getElementById("emailTemplateText");
    const useTemplateCheckbox = document.getElementById("useCustomTemplate");

    const messageText = messageArea ? messageArea.value : "";

    let templateHtml;

    if (useTemplateCheckbox && useTemplateCheckbox.checked && templateArea && templateArea.value.trim()) {
        templateHtml = templateArea.value;
    } else {
        const generator = DEFAULT_HTML_TEMPLATES[currentEmailMessageKey];
        templateHtml = generator ? generator(messageText) : "<p>" + messageText + "</p>";
    }

    const sampleValues = EMAIL_PREVIEW_SAMPLE_DATA[currentEmailMessageKey] || {};

    //links (like the Cancel Registration button) are just for show in the
    //preview, so clicking them shouldn't navigate anywhere
    const disableLinksScript =
        "<script>document.addEventListener('click', function (e) {" +
        "var link = e.target.closest('a'); if (link) { e.preventDefault(); }" +
        "});<" + "/script>";

    previewFrame.srcdoc =
        renderPreviewTemplate(templateHtml, sampleValues) + disableLinksScript;
}

//builds the "&branch=...&className=..." query suffix for the currently
//selected class scope, or an empty string when scope is Global
function getEmailScopeQueryParams() {
    if (!currentEmailClassScope) {
        return "";
    }

    return "&branch=" + encodeURIComponent(currentEmailClassScope.branch) +
        "&className=" + encodeURIComponent(currentEmailClassScope.name);
}

//loads the current custom email messages and templates for whichever class
//scope (Global, or one specific class) is selected, then displays whichever
//email type is selected in the dropdown
async function loadEmailMessages() {
    const select = document.getElementById("emailMessageSelect");

    if (!select) {
        return;
    }

    try {
        //wait for any in-flight save (e.g. the auto-save that just fired on
        //blur) to actually reach the server before reading fresh data back,
        //otherwise this can race ahead and show the pre-edit values
        await lastEmailSaveRequest;

        const scopeParams = getEmailScopeQueryParams();

        const [messagesResponse, templatesResponse] = await Promise.all([
            fetch(SCRIPT_URL + "?getEmailMessages=true" + scopeParams),
            fetch(SCRIPT_URL + "?getEmailTemplates=true" + scopeParams)
        ]);

        emailMessages = await messagesResponse.json();
        emailTemplates = await templatesResponse.json();

        currentEmailMessageKey = select.value || "confirmation";
        displayCurrentEmailMessage();
    } catch (error) {
        console.error(error);
    }
}

//switches which class the Email Messages section is scoped to (Global, or
//one specific class), then reloads messages/templates for that scope
function switchEmailClass(value) {
    currentEmailClassScope = value ? JSON.parse(value) : null;
    loadEmailMessages();
}

//shows the message/template for whichever email is currently selected
function displayCurrentEmailMessage() {
    const textArea = document.getElementById("emailMessageText");
    const templateArea = document.getElementById("emailTemplateText");
    const useTemplateCheckbox = document.getElementById("useCustomTemplate");
    const placeholderHint = document.getElementById("emailPlaceholderHint");

    if (!textArea) {
        return;
    }

    textArea.value = emailMessages[currentEmailMessageKey] || "";

    const currentTemplate = emailTemplates[currentEmailMessageKey] || "";

    templateArea.value = currentTemplate;
    useTemplateCheckbox.checked = currentTemplate !== "";

    placeholderHint.textContent =
        (EMAIL_PLACEHOLDERS[currentEmailMessageKey] || [])
            .map(function (name) { return "{{" + name + "}}"; })
            .join(", ");

    toggleCustomTemplate();
    updateEmailTemplatePreview();
}

//shows/hides the custom template box based on the checkbox, shows a warning
//under the Message box when the template is active, and locks the Message
//box so it can't be edited while it has no effect on the actual email
function toggleCustomTemplate() {
    const useTemplateCheckbox = document.getElementById("useCustomTemplate");
    const section = document.getElementById("customTemplateSection");
    const notice = document.getElementById("messageOverriddenNotice");
    const messageArea = document.getElementById("emailMessageText");

    if (!useTemplateCheckbox || !section) {
        return;
    }

    section.style.display = useTemplateCheckbox.checked ? "block" : "none";

    if (notice) {
        notice.style.display = useTemplateCheckbox.checked ? "block" : "none";
    }

    if (messageArea) {
        messageArea.disabled = useTemplateCheckbox.checked;
    }
}

//runs when the admin checks/unchecks "Use a full custom HTML template".
//If they just checked it and the box is still empty, pre-fill it with the
//current built-in layout (with the existing message baked in) so they're
//editing a real starting point instead of a blank textarea.
function handleCustomTemplateToggle() {
    const useTemplateCheckbox = document.getElementById("useCustomTemplate");
    const templateArea = document.getElementById("emailTemplateText");
    const messageArea = document.getElementById("emailMessageText");

    if (
        useTemplateCheckbox && useTemplateCheckbox.checked &&
        templateArea && !templateArea.value.trim()
    ) {
        const generator = DEFAULT_HTML_TEMPLATES[currentEmailMessageKey];

        if (generator) {
            templateArea.value = generator(messageArea ? messageArea.value : "");
        }
    }

    toggleCustomTemplate();
    updateEmailTemplatePreview();

    if (useTemplateCheckbox && !useTemplateCheckbox.checked) {
        //unchecking hides the Save button along with the template box, so
        //save the "no template" state right away instead of losing it
        emailTemplates[currentEmailMessageKey] = "";
        sendEmailMessagesPayload(buildEmailMessagesPayload());
    }
}

//saves whatever was typed for the email currently being edited into local
//state, then switches the textarea to show the newly selected email
function switchEmailMessage(newKey) {
    const textArea = document.getElementById("emailMessageText");
    const templateArea = document.getElementById("emailTemplateText");
    const useTemplateCheckbox = document.getElementById("useCustomTemplate");

    if (textArea) {
        emailMessages[currentEmailMessageKey] = textArea.value;
    }

    if (templateArea && useTemplateCheckbox) {
        emailTemplates[currentEmailMessageKey] = useTemplateCheckbox.checked ? templateArea.value : "";
    }

    currentEmailMessageKey = newKey;
    displayCurrentEmailMessage();
}

//builds the payload sent to updateEmailMessages, from whatever is
//currently held in emailMessages/emailTemplates and the active class scope
function buildEmailMessagesPayload() {
    return {
        type: "updateEmailMessages",
        branch: currentEmailClassScope ? currentEmailClassScope.branch : "",
        className: currentEmailClassScope ? currentEmailClassScope.name : "",
        confirmation: emailMessages.confirmation || "",
        waitlist: emailMessages.waitlist || "",
        removal: emailMessages.removal || "",
        cancellation: emailMessages.cancellation || "",
        update: emailMessages.update || "",
        classCancelled: emailMessages.classCancelled || "",
        templates: {
            confirmation: emailTemplates.confirmation || "",
            waitlist: emailTemplates.waitlist || "",
            removal: emailTemplates.removal || "",
            cancellation: emailTemplates.cancellation || "",
            update: emailTemplates.update || "",
            classCancelled: emailTemplates.classCancelled || ""
        }
    };
}

//tracks the most recent email save request so a follow-up read (e.g.
//re-loading messages after switching class scope) can wait for it to
//actually reach the server instead of racing ahead and reading stale data
let lastEmailSaveRequest = Promise.resolve();

function sendEmailMessagesPayload(payload) {
    lastEmailSaveRequest = fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload)
    }).catch(function () {});

    return lastEmailSaveRequest;
}

//saves the custom email messages and templates typed into the admin page
function saveEmailMessages() {
    const textArea = document.getElementById("emailMessageText");
    const templateArea = document.getElementById("emailTemplateText");
    const useTemplateCheckbox = document.getElementById("useCustomTemplate");

    if (textArea && !textArea.disabled) {
        emailMessages[currentEmailMessageKey] = textArea.value;
    }

    if (templateArea && useTemplateCheckbox) {
        emailTemplates[currentEmailMessageKey] = useTemplateCheckbox.checked ? templateArea.value : "";
    }

    sendEmailMessagesPayload(buildEmailMessagesPayload()).then(function () {
        alert("Email messages saved.");
    });
}

//automatically saves the plain Message blurb when the admin clicks away
//from it (as long as a custom template isn't overriding it), showing a
//quiet "Saved" indicator once the save has actually reached the server
function autoSaveMessage() {
    const textArea = document.getElementById("emailMessageText");

    if (!textArea || textArea.disabled) {
        return;
    }

    emailMessages[currentEmailMessageKey] = textArea.value;

    sendEmailMessagesPayload(buildEmailMessagesPayload()).then(function () {
        showAutoSaveIndicator();
    });
}

//briefly flashes the "Saved" text next to the Message label
function showAutoSaveIndicator() {
    const indicator = document.getElementById("messageAutoSaveIndicator");

    if (!indicator) {
        return;
    }

    indicator.style.opacity = "1";

    clearTimeout(showAutoSaveIndicator.hideTimeout);
    showAutoSaveIndicator.hideTimeout = setTimeout(function () {
        indicator.style.opacity = "0";
    }, 2000);
}

//populates the "View" dropdown on the admin page with every sheet in the
//spreadsheet (Master Registrations, Waitlist, Cancelled Classes, per-class
//rosters, etc.) and loads Master Registrations into the table by default
async function loadSheetNames() {
    const select = document.getElementById("registrationsSheetSelect");

    if (!select) {
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL + "?getSheetNames=true");
        const names = await response.json();

        const orderedNames = [
            "Master Registrations",
            ...names.filter(function (name) {
                return name !== "Master Registrations";
            })
        ];

        select.innerHTML = "";

        for (let i = 0; i < orderedNames.length; i++) {
            const option = document.createElement("option");

            option.value = orderedNames[i];
            option.textContent = orderedNames[i];

            select.appendChild(option);
        }

        select.value = "Master Registrations";
        loadSheetTable("Master Registrations");
    } catch (error) {
        console.error(error);
    }
}

//fetches a sheet's data from the spreadsheet and renders it as a table
async function loadSheetTable(sheetName) {
    const wrapper = document.getElementById("registrationsTableWrapper");

    if (!wrapper) {
        return;
    }

    wrapper.innerHTML = "<p>Loading registrations...</p>";

    try {
        const response = await fetch(
            SCRIPT_URL +
            "?getSheetData=true&sheetName=" +
            encodeURIComponent(sheetName)
        );

        const data = await response.json();

        if (!data.headers || data.headers.length === 0) {
            wrapper.innerHTML = "<p>No data found for this sheet.</p>";
            return;
        }

        let html = '<table class="sheet-table"><thead><tr>';

        for (let i = 0; i < data.headers.length; i++) {
            html += "<th>" + data.headers[i] + "</th>";
        }

        html += "</tr></thead><tbody>";

        if (data.rows.length === 0) {
            html +=
                '<tr><td colspan="' + data.headers.length + '">No rows yet.</td></tr>';
        }

        for (let r = 0; r < data.rows.length; r++) {
            html += "<tr>";

            for (let c = 0; c < data.rows[r].length; c++) {
                html += "<td>" + data.rows[r][c] + "</td>";
            }

            html += "</tr>";
        }

        html += "</tbody></table>";

        wrapper.innerHTML = html;
    } catch (error) {
        console.error(error);
        wrapper.innerHTML = "<p>Could not load registrations.</p>";
    }
}

//downloads the currently viewed sheet as a real .xlsx Excel file
async function exportSheetToExcel() {
    const select = document.getElementById("registrationsSheetSelect");

    if (!select || !select.value) {
        alert("Please select a sheet to export.");
        return;
    }

    try {
        const response = await fetch(
            SCRIPT_URL +
            "?exportExcel=true&sheetName=" +
            encodeURIComponent(select.value)
        );

        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        const byteCharacters = atob(data.base64);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const downloadUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error(error);
        alert("Could not export to Excel. Check the browser console for details.");
    }
}

//loading page while classes load onto screen
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPage);
} else {
    startPage();
}

//refresh every 30 seconds
setInterval(function () {
    if (document.getElementById("classCatalog")) {
        loadClasses();
    }

    if (document.getElementById("existingClass") && !adminSelectedClass) {
        loadAdminClasses();
    }

    const sheetSelect = document.getElementById("registrationsSheetSelect");

    if (sheetSelect) {
        loadSheetTable(sheetSelect.value);
    }
}, 30000);

async function loadRegistrationsForSelectedClass() {
    const dropdown =
        document.getElementById("registrationToRemove");

    if (!dropdown || !adminSelectedClass) {
        return;
    }

    dropdown.innerHTML =
        '<option value="">Loading registrations...</option>';

    const url =
        SCRIPT_URL +
        "?getRegistrations=true&branch=" +
        encodeURIComponent(adminSelectedClass.branch) +
        "&className=" +
        encodeURIComponent(adminSelectedClass.name);

    const response =
        await fetch(url);

    const registrations =
        await response.json();

    dropdown.innerHTML =
        '<option value="">Select Registration</option>';

    for (let i = 0; i < registrations.length; i++) {
        const option =
            document.createElement("option");

        option.value =
            registrations[i].cancelId;

        option.textContent =
            registrations[i].name + " - " + registrations[i].email;

        dropdown.appendChild(option);
    }
}

//on admin page to select speciic registration and remove it from google sheet
function removeRegistration() {
    const dropdown =
        document.getElementById("registrationToRemove");

    if (!dropdown || dropdown.value === "") {
        alert("Please select a registration to remove.");
        return;
    }

    const cancelId = dropdown.value;

    const confirmRemove =
        confirm("Remove this person from the class?");

    if (!confirmRemove) {
        return;
    }

    fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({
            type: "removeRegistration",
            cancelId: cancelId
        })
    });

    // Remove registration from the dropdown as an option 
    dropdown.options[dropdown.selectedIndex].remove();

    setTimeout(function () {
        alert("Registration removed. Please check the Google Sheet.");

        loadRegistrationsForSelectedClass();
        loadAdminClasses();

    }, 2500);
}