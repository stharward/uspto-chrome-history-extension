/* SET UP OF THE PAGE */

function renderHistoryTable(divName, historyData) {
  //TODO: make the table look nicer
  var t = document.createElement('table');
  for (var i = 0; i < historyData.length; ++i) {
    r = t.insertRow(i);
    tc = r.insertCell(0);
    tc.textContent = "";
    cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = JSON.stringify(historyData[i]);
    cb.checked = true;
    tc.appendChild(cb);
    tc = r.insertCell(1);
    tc.textContent = historyData[i]['title'];
    tc = r.insertCell(2);
    tc.textContent = historyData[i]['timestamp']
  }
  document.getElementById(divName).appendChild(t);
  document.getElementById(divName).appendChild( document.createElement('hr') );
}

function makeHistoryItemProcessor(divName) {
  return function historyItemProcessor(historyItems) {
    var tableEntries = [];
    //console.log("processing", historyItems.length, "history items", historyItems);
    for (var i = 0; i < historyItems.length; ++i) {
      // FIXME: clean up the title
      // FIXME: find the first visit, not the most recent
      var e = {
        'url': historyItems[i].url,
        'title': historyItems[i].title,
        'lastvisit': historyItems[i].lastVisitTime,
        'timestamp': (new Date(historyItems[i].lastVisitTime)).toLocaleString(),
        'id': historyItems[i].id
      };
      tableEntries.push(e);
    }
    //console.log("history list contains", tableEntries.length, "history items");
    renderHistoryTable(divName, tableEntries);
  };
}

function buildAvailableHistoryList(divName) {
  /* have to do this after the base HTML is totally loaded */
  document.getElementById('generateHistoryPageButton').onclick = generateHistoryPage;

  // TODO: make this configurable
  var cutoffTime = (new Date).getTime() - (1000 * 60 * 60 * 24 * 90)

  //FIXME: search the history for the correct databases
  chrome.history.search({
      'startTime': cutoffTime, // starting with the specified cutoff time ...
      'text': 'wikipedia'      // ... return all results from wikipedia
    },
    makeHistoryItemProcessor(divName) // this is a closure
  );
  chrome.history.search({
      'startTime': cutoffTime, // starting with the specified cutoff time ...
      'text': 'stackoverflow'  // ... return all results from stackoverflow
    },
    makeHistoryItemProcessor(divName) // this is a closure
  );
}

document.addEventListener('DOMContentLoaded',
  function() { buildAvailableHistoryList("availableHistoryList_div"); }
);

/* INTERACTIVE FUNCTIONALITY OF THE PAGE */

function generateHistoryPage() {
  var message = [];
  f = document.getElementById('historyEntriesForm').getElementsByTagName('input');
  for (i = 0; i < f.length; i++) {
    if (f[i].checked) {
      message.push(JSON.parse(f[i].value));
    }
  }
  console.log("sending message", message, "with entries for printing");
  //FIXME: pass the message to the background form for rendering
}

//TODO: check or uncheck all entries in a table
