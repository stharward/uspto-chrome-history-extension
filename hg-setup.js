function makeCheckBoxToggler(mastercb, cblist) {
  return function() {
    for (var i=0; i<cblist.length; i++) {
      cblist[i].checked = mastercb.checked;
    }
  }
}

function renderHistoryTable(divName, website, historyData) {
  var d = document.getElementById(divName);

  var t = document.createElement('table');
  var h = t.createTHead();
  var hr = h.insertRow(0);
  var hc = hr.insertCell(0);
  var hcb = document.createElement('input');
  hcb.type = 'checkbox';
  hcb.checked = true;
  hc.appendChild(hcb);
  hc = hr.insertCell(1);
  hc.textContent = "searches on " + website;

  childcbs = [];
  for (var i = 0; i < historyData.length; ++i) {
    var r = t.insertRow(i+1);
    var tc = r.insertCell(0);
    tc.textContent = "";
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'historyentry';
    cb.value = JSON.stringify(historyData[i]);
    cb.checked = true;
    childcbs.push(cb);
    tc.appendChild(cb);
    tc = r.insertCell(1);
    tc.textContent = historyData[i]['query'];
    tc = r.insertCell(2);
    tc.textContent = historyData[i]['timestamp']
  }
  hcb.onchange = makeCheckBoxToggler(hcb,childcbs);
  d.appendChild(t);
  d.appendChild( document.createElement('hr') );
}

function makeHistoryItemProcessor(divName, website, queryExtractionF) {
  return function historyItemProcessor(historyItems) {
    var tableEntries = [];
    for (var i = 0; i < historyItems.length; ++i) {
      // TODO: find the first visit, not the most recent
      var e = {
        'website': website,
        'url': historyItems[i].url,
        'query': queryExtractionF(historyItems[i]),
        'lastvisit': historyItems[i].lastVisitTime,
        'timestamp': (new Date(historyItems[i].lastVisitTime)).toLocaleString(),
        'id': historyItems[i].id
      };
      if (e['query']) {
        tableEntries.push(e);
      }
    }
    renderHistoryTable(divName, website, tableEntries);
  };
}

function buildAvailableHistoryList(divName) {
  // TODO: make this configurable
  var cutoffTime = (new Date).getTime() - (1000 * 60 * 60 * 24 * 90);

  // clear the existing entries
  document.getElementById(divName).textContent = '';

  var websites = [
    {'website':'Google Books',
      'matchpattern':'tbm=bks',
      'queryextractor':function(h) { return h.title.slice(0,-15); }
    },
    {'website':'Google Images',
      'matchpattern':'tbm=isch',
      'queryextractor':function(h) { return h.title.slice(0,-15); }
    },
    {'website':'Google Scholar',
      'matchpattern':'scholar.google.com',
      'queryextractor':function(h) { return h.title.slice(0,-17); }
    },
    {'website':'Google Patents',
      'matchpattern':'tbm=pts',
      'queryextractor':function(h) { return h.title.slice(0,-16); }
    }
  ]

  for (var i = 0; i < websites.length; i++) {
    w = websites[i];
    chrome.history.search({
        'startTime': cutoffTime,  // starting with the specified cutoff time ...
        'text': w['matchpattern'] // ... return all results from the website
      },
      makeHistoryItemProcessor(divName, w['website'], w['queryextractor']) // this is a closure
    );
  }
}

document.addEventListener('DOMContentLoaded',
  function() { buildAvailableHistoryList("availableHistoryList_div"); }
);
