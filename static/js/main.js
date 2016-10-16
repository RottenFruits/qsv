//通信設定
var host = "ws://localhost:5000/data_load";
var socket = new WebSocket(host);
var host_action = "ws://localhost:5000/action";
var socket_action = new WebSocket(host_action);


//数値の桁数を揃える関数
function digitFormat(num, digit) {
  var len = String(num).length;
  if(digit > len) {
    return new Array((digit - len) + 1).join(0) + num;
  } else {
    return num;
  }
}

//カンマ区切りのテキストをjsonに変換
function csv2json(csvArray){
  var jsonArray = [];

  //1行ごとに分割
  // 1行目から「項目名」の配列を生成する
  csvArray = csvArray.split('\n');
  var items = csvArray[0].split(',');

  // CSVデータの配列の各行をループ処理する
  //// 配列の先頭要素(行)は項目名のため処理対象外
  //// 配列の最終要素(行)は空のため処理対象外
  for (var i = 1; i < csvArray.length - 1; i++) {
    var a_line = new Object();
    // カンマで区切られた各データに分割する
    var csvArrayD = csvArray[i].split(',');
    //// 各データをループ処理する
    var keta = parseInt(items.length / 10);
    for (var j = 0; j < items.length; j++) {
      // 要素名：items[j] データ：csvArrayD[j]
      var v_order = digitFormat(j, keta + 1); //変数の順番を変えないために先頭に数値をつける
      a_line[v_order + '_' + items[j]] = csvArrayD[j];
    }
    jsonArray.push(a_line);
  }
  //console.debug(jsonArray);
  return jsonArray;
}


//データを受け取ってグラフを描く
function renderGraph(data){
  //データ読み込み
  var nodes = data["nodes"];
  var edges = data["links"];
  var myNodes = new Nodes(nodes);
  var myEdges = new Edges(edges);

  //プロット
  var networkgraph = new NetworkGraph({
    // Basic Backbone view options
    el:"#graph",
    collection:{
      nodes:myNodes,
      edges:myEdges
    },
    //plot size
    height:600,
    width:1200,
  });
  networkgraph.renderNetwork();

  var histogram = new Histogram({
    // Basic Backbone view options
    el:".bar",
    collection: myNodes,
    margin: {top: 2, right: 2, bottom: 2, left: 2},
    //plot size
    height:50,
    width:220,
  });

  histogram.render();

};

//パラメータ変更した際のデータ受取
socket.onmessage = function(message){
  var data = message.data;
  data = JSON.parse(data);//文字列で受け取るのでparseする必要あり
  renderGraph(data);
};

//アップロード、セレクト後の受信してリストの更新
socket_action.onmessage = function(message){
  var data = JSON.parse(message.data)
  var tables = _.pluck(data.db, "table");
  var selected_table_ix = _.indexOf(tables, data.selected);
  var selected_table_header = data.db[selected_table_ix].header;

  //データリストの更新
  var tabListBtn = document.getElementById('table_list_btn');
  tabListBtn.options.length = 0;
  for (i = 0; i < tables.length; i++){
    tabListBtn.options[i] = new Option(tables[i]);
  }
  tabListBtn.selectedIndex = selected_table_ix;

  //変数リストの更新
  var valListBtn = document.getElementById('val_list_btn');
  valListBtn.options.length = 0;
  for (i = 0; i < selected_table_header.length; i++){
    valListBtn.options[i] = new Option(selected_table_header[i]);
  }
}

//スライドバー作成
overlap_sl = {"min":0, "max":1, "step":0.01, "name":"overlap"};
nr_cube_sl = {"min":0, "max":100, "step":1, "name":"nr_cube"};

var add_overlap_sl = new AddSlider({
  el:"#overlap",
  model:overlap_sl
});
var add_nr_cube_sl = new AddSlider({
  el:"#nr_cube",
  model:nr_cube_sl
});

add_overlap_sl.renderSlider();
add_nr_cube_sl.renderSlider();

//ボタン作成
var add_file_btn = new AddBtn({
  el:"#file",
  model:{"name":"file"}
});
var add_upload_btn = new AddBtn({
  el:"#upload",
  model:{"name":"upload"}
});
var add_create_btn = new AddBtn({
  el:"#create",
  model:{"name":"create"}
});


add_file_btn.renderFileUploadButton();//ファイル選択ボタン
add_upload_btn.renderButton();//アップロードボタン
add_create_btn.renderButton();//作図ボタン


//テーブルセレクト
function selectTable() {
  var selectTableBtn = document.getElementById('table_list_btn');
  var table = selectTableBtn.options[selectTableBtn.selectedIndex].value;
  socket_action.send(
    JSON.stringify({"action":"selectTable","table":table})
  );
}
