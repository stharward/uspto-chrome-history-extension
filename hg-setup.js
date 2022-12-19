function makeCheckBoxToggler(mastercb, cblist) {
  return function() {
    for (var i=0; i<cblist.length; i++) {
      cblist[i].checked = mastercb.checked;
    }
  }
}

function renderHistoryTable(divName, website, historyData) {
  var d = document.getElementById(divName);

  // generate header
  var t = document.createElement('table');
  t.className = 'selectable';
  var h = t.createTHead();
  var hr = h.insertRow(0);
  var hc = hr.insertCell(0);
  var hcb = document.createElement('input');
  hcb.type = 'checkbox';
  hcb.checked = false;
  hc.appendChild(hcb);
  hc = hr.insertCell(1);
  hc.colSpan = 2;
  hc.textContent = "searches on " + website;

  // generate body
  var childcbs = [];
  var tBody = document.createElement('tbody');
  var lastvisit = 0;
  var border = ''
  for (var i = 0; i < historyData.length; ++i) {
    // put a subtle visual separator between queries that happened more than 1 hour apart
    var brd = ((lastvisit - historyData[i]['lastvisit']) > 3600000) ? 'thin solid #009' : 'none';
    lastvisit = historyData[i]['lastvisit'];

    console.log("border is", brd);

    var r = tBody.insertRow(i);
    var tc = r.insertCell(0);
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'historyentry';
    cb.value = JSON.stringify(historyData[i]);
    cb.checked = false;
    childcbs.push(cb);
    tc.appendChild(cb);
    tc.style.borderTop = brd;
    tc = r.insertCell(1);
    tc.textContent = historyData[i]['timestamp'];
    tc.style.borderTop = brd;
    tc = r.insertCell(2);
    tc.textContent = historyData[i]['query'];
    tc.style.borderTop = brd;
  }
  hcb.onchange = makeCheckBoxToggler(hcb,childcbs);
  t.appendChild(tBody);
  d.appendChild(t);
  d.appendChild( document.createElement('hr') );
}

function makeHistoryItemProcessor(divName, website, queryExtractionF) {
  return function historyItemProcessor(historyItems) {
    var tableEntries = [];
    var queries = {}
    for (var i = 0; i < historyItems.length; ++i) {
      var e = {
        'website': website,
        'url': historyItems[i].url,
        'query': queryExtractionF(historyItems[i]),
        'lastvisit': historyItems[i].lastVisitTime,
        'timestamp': (new Date(historyItems[i].lastVisitTime)).toLocaleString(),
        'id': historyItems[i].id
      };
      if (e['query']) {
        // filter out duplicate queries; Chrome creates different history entries 
        // when the user goes to the 2nd, 3rd, etc. page of search results, because
        // these have unique URLs.  However, for the purposes of a prior art search
        // history, it's all just one query.
        if (!(e['query'] in queries)) {
          tableEntries.push(e);
          queries[e['query']] = true;
        }
      }
    }
    renderHistoryTable(divName, website, tableEntries);
  };
}

function buildAvailableHistoryList(divName, cutoff) {
  var cutoffTime = (new Date).getTime() - (1000 * cutoff);

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
  function() { buildAvailableHistoryList("availableHistoryList_div", 86400); }
);
