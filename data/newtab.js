var currentFolder = null;

self.port.on("newfolder", function(title) {
  var div_folder = document.createElement("div");
  div_folder.className = "folder";

  var h2_title = document.createElement("h2");
  h2_title.appendChild(document.createTextNode(title));
  div_folder.appendChild(h2_title);

  var ul_items = document.createElement("ul");
  currentFolder = ul_items;
  div_folder.appendChild(ul_items);

  document.body.appendChild(div_folder);
});
self.port.on("newitem", function(title, uri) {
  var li_item = document.createElement("li");
  li_item.className = "item";
  li_item.span_keyword = document.createElement("span");
  li_item.span_keyword.className = "keyword";
  li_item.appendChild(li_item.span_keyword);

  var a_link = document.createElement("a");
  a_link.className = "link";
  a_link.href = uri;
  a_link.appendChild(document.createTextNode(title));

  li_item.appendChild(a_link);
  currentFolder.appendChild(li_item);
});

self.port.on("keyword", function(i, j, kw) {
  var folders = document.getElementsByClassName("folder");
  var folder = folders.item(i);
  var items = folder.getElementsByClassName("item");
  var item = items.item(j);
  item.span_keyword.appendChild(document.createTextNode(kw));
});
