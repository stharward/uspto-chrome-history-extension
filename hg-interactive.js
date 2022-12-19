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

function generateHistoryPage() {
  f = document.forms['historyEntriesForm'].querySelectorAll('input.historyentry');
  var entries = []
  for (i = 0; i < f.length; i++) {
    if (f[i].checked) {
      entries.push(JSON.parse(f[i].value));
    }
  }

  entries.sort(function(a,b){return a.lastvisit - b.lastvisit});

  var h = document.createElement('h1');
  h.textContent = 'Web Search History';
  document.getElementById('printable_div').appendChild(h);
  
  var t = document.createElement('table');
  t.className = 'printable';
  h = t.createTHead();
  hr = h.insertRow(0);
  hc = hr.insertCell(0);
  hc.textContent = 'date, time';
  hc = hr.insertCell(1);
  hc.className += 'website';
  hc.textContent = 'web site';
  hc = hr.insertCell(2);
  hc.textContent = 'search string';

  var tBody = document.createElement('tbody');
  for (var i = 0; i < entries.length; ++i) {
    r = tBody.insertRow(i);
    tc = r.insertCell(0);
    tc.innerHTML = entries[i]['timestamp'];
    tc = r.insertCell(1);
    tc.className += 'website';
    tc.textContent = entries[i]['website'];
    tc = r.insertCell(2);
    tc.innerHTML = entries[i]['query'];
  }
  t.appendChild(tBody);
  document.getElementById('printable_div').appendChild(t);

  document.getElementById('selection_div').textContent = '';
  document.getElementById('instructions_div').textContent = '';

  window.print();
}

function regenSelectionList() {
  var s = document.getElementById('cutoffSelector');
  ct = s.options[s.selectedIndex].value;
  var s = document.getElementById('shortQuerySelector');
  sq = s.options[s.selectedIndex].value;
  buildAvailableHistoryList("availableHistoryList_div", ct, sq);
}

function toggleAboutSection() {
  var s = document.getElementById('about_div');
  if (s.style.display === "none") {
    s.style.display = "block";
  } else {
    s.style.display = "none";
  }
}

window.onload = function() {
  document.getElementById('generateHistoryPageButton').onclick = generateHistoryPage;
  document.getElementById('cutoffSelector').onchange = regenSelectionList;
  document.getElementById('shortQuerySelector').onchange = regenSelectionList;
  document.getElementById('aboutHeader').onclick = toggleAboutSection;
}
