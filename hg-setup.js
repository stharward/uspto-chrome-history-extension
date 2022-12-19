/*
Written by Soren Harward <soren.harward@uspto.gov>, May 2015

This software was made by an employee of the United States Government as part
of his official duties. As such, it is not subject to copyright in the United
States. It is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or distribute this
software, either in source code form or as a compiled binary, for any purpose,
commercial or non-commercial, and by any means.

In jurisdictions that recognize copyright laws, the author of this software
dedicates any and all copyright interest in the software to the public domain.
I make this dedication for the benefit of the public at large and to the
detriment of our heirs and successors. I intend this dedication to be an overt
act of relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHOR, THE UNITED STATES PATENT AND TRADEMARK OFFICE, THE UNITED STATES
DEPARTMENT OF COMMERCE, OR ANY OTHER DEPARTMENT, BODY, AGENCY, DIVISION,
SECTION, OR GROUP OF THE UNITED STATES GOVERNMENT BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
*/

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
    tc.innerHTML = historyData[i]['timestamp'];
    tc.style.borderTop = brd;
    tc = r.insertCell(2);
    tc.innerHTML = historyData[i]['query'];
    tc.style.borderTop = brd;
  }
  hcb.onchange = makeCheckBoxToggler(hcb,childcbs);
  t.appendChild(tBody);
  d.appendChild(t);
  d.appendChild( document.createElement('hr') );
}

function makeHistoryItemProcessor(divName, website, queryExtractionF, shortQueryThreshold) {
  return function historyItemProcessor(historyItems) {

    var tableEntries = [];
    var keptHistoryItems = [];
    if (historyItems.length > 0) {
      var queries = {}
      for (var i = historyItems.length - 1; i >= 0; --i) {
        var e = {
          'website': website,
          'url': historyItems[i].url,
          'query': queryExtractionF(historyItems[i]),
          'lastvisit': historyItems[i].lastVisitTime,
          'timestamp': (new Date(historyItems[i].lastVisitTime)).toLocaleString().replace(/[, ]+/g, '&nbsp;'),
          'id': historyItems[i].id
        };
        if (e['query']) {
          // filter out duplicate queries; Chrome creates different history entries 
          // when the user goes to the 2nd, 3rd, etc. page of search results, because
          // these have unique URLs.  However, for the purposes of a prior art search
          // history, it's all just one query.
          if (!(e['query'] in queries)) {
            keptHistoryItems.unshift(e);
            queries[e['query']] = true;
          }
        }
      }
    }

    if (keptHistoryItems.length > 0) {
      tableEntries.push(keptHistoryItems[0]);

      // keep only the queries that were viewed for longer than shortQueryThreshold milliseconds
      for (var i = 1; i < keptHistoryItems.length; ++i) {
        var d = keptHistoryItems[i-1].lastvisit - keptHistoryItems[i].lastvisit;
        console.log(i, keptHistoryItems[i].lastvisit, d);
        if (d > shortQueryThreshold) {
          tableEntries.push(keptHistoryItems[i]);
        }
      }

    }
    renderHistoryTable(divName, website, tableEntries);
  };
}

function buildAvailableHistoryList(divName, cutoff, shortQueryThreshold) {
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
      'queryextractor':function(h) {
        if (h.title.slice(0,-14) == 'Google Scholar') {
          return h.title.slice(0,-17);
        } else {
          console.log(h);
          u = h.url.split('?')[1];
          isActuallyAQuery = false;
          if (u) {
            u = u.split('&');
            s = '';
            for (var i = 0; i < u.length; i++) {
              if (u[i].substr(0,2) == 'q=') {
                if (u[i].substr(0,9) != 'q=related') {
                  isActuallyAQuery = true;
                  s += decodeURIComponent(u[i].substr(2)).replace(/\+/g,' ') + ' ';
                }
              } else if (u[i].substr(0,6) == 'as_yhi') {
                y = u[i].substr(7);
                if (y) {
                  s += '[before:' + y + '] ';
                }
              } else if (u[i].substr(0,6) == 'as_ylo') {
                y = u[i].substr(7);
                if (y) {
                  s += '[after:' + y + '] ';
                }
              }
            }
            if (isActuallyAQuery) {
              return s;
            }
          } else {
            return;
          }
        }
      }
    },
    {'website':'Google Patents (old)',
      'matchpattern':'tbm=pts',
      'queryextractor':function(h) { return h.title.slice(0,-16); }
    },
    {'website':'Google Patents',
      'matchpattern':'patents.google.com',
      'queryextractor':function(h) {
        if ((h.url.indexOf('?') >= 0)
          && ((h.url.substr(0,30) == 'https://patents.google.com/?q=') ||
            (h.url.substr(0,38) == 'https://patents.google.com/advanced?q='))
        ) {
          u = h.url.split('?')[1];
          u = u.split('&');
          s = '<dl>';
          tc = 0;
          for (var i = 0; i < u.length; i++) {
            // parse keywords
            if (u[i].substr(0,2) == 'q=') {
              s += '<dt>Keyword Group ' + (++tc).toString() + '</dt>';
              s += '<dd>[' + decodeURIComponent(u[i].substr(2).replace(/\+/g,' ').replace(/,/g,'] OR [')) + ']</dd>';
            // parse inventor(s)
            } else if (u[i].substr(0,9) == 'inventor=') {
              s += '<dt>Inventor(s)</dt>';
              s += '<dd>[' + decodeURIComponent(u[i].substr(9).replace(/\+/g,' ').replace(/,/g,'] OR [')) + ']</dd>';
            // parse assignee(s)
            } else if (u[i].substr(0,9) == 'assignee=') {
              s += '<dt>Assignee(s)</dt>';
              s += '<dd>[' + decodeURIComponent(u[i].substr(9).replace(/\+/g,' ').replace(/,/g,'] OR [')) + ']</dd>';
            // parse country(ies)
            } else if (u[i].substr(0,8) == 'country=') {
              s += '<dt>Patent Office(s)</dt>';
              s += '<dd>[' + decodeURIComponent(u[i].substr(8).replace(/\+/g,' ').replace(/,/g,'] OR [')) + ']</dd>';
            // parse CPC
            } else if (u[i].substr(0,4) == 'cpc=') {
              s += '<dt>CPC</dt>';
              s += '<dd>' + decodeURIComponent(u[i].substr(4)) + '</dd>';
            // parse dates
            } else if (u[i].substr(0,7) == 'before=') {
              s += '<dt>Before</dt>';
              l = decodeURIComponent(u[i].substr(7));
              if (l.substr(0,12) == 'publication:') {
                l = l.replace('publication:','Publication Date: ');
              } else if (l.substr(0,7) == 'filing:') {
                l = l.replace('filing:','Filing Date: ');
              } else {
                l = 'Priority Date: ' + l;
              }
              s += '<dd>' + l + '</dd>';
            } else if (u[i].substr(0,6) == 'after=') {
              s += '<dt>After</dt>';
              l = decodeURIComponent(u[i].substr(6));
              if (l.substr(0,12) == 'publication:') {
                l = l.replace('publication:','Publication Date: ');
              } else if (l.substr(0,7) == 'filing:') {
                l = l.replace('filing:','Filing Date: ');
              } else {
                l = 'Priority Date: ' + l;
              }
              s += '<dd>' + l + '</dd>';
            }
          }
          s += '</dl>';
        } else {
          s = '';
        }
        return s;
      }
    }
  ]

  for (var i = 0; i < websites.length; i++) {
    w = websites[i];
    chrome.history.search({
        'startTime': cutoffTime,  // starting with the specified cutoff time ...
        'text': w['matchpattern'] // ... return all results from the website
      },
      makeHistoryItemProcessor(divName, w['website'], w['queryextractor'], shortQueryThreshold) // this is a closure
    );
  }
}

document.addEventListener('DOMContentLoaded',
  function() { buildAvailableHistoryList("availableHistoryList_div", 86400, 0); }
);
