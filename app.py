# -*- coding: utf-8 -*-
#ライブラリ読み込み
import pandas as pd
import pandas.io.sql as psql
import sqlite3
import km2
import numpy as np
from flask import Flask
from flask import render_template
from flask_sockets import Sockets
from gevent import pywsgi
from geventwebsocket.handler import WebSocketHandler
import json

db = "data/data.db"
app = Flask(__name__)
sockets = Sockets(app)

#グラフ用データ作成
def create_graph_data(data = None, nr_cube = 10, overlap = 0.9, colored_by = None):
    #データ読込
    data = get_data_from_table(db, data)

    data_color = data[colored_by]
    data_label = data.ix[:, data.shape[1] - 1]
    data = data.ix[:, 0:(data.shape[1] - 1)]

    # Initialize
    mapper = km2.KeplerMapper(verbose = 1)
    # Fit to and transform the data
    projected_data = mapper.fit_transform(data, projection = [0, 1]) # X-Y axis
    # projected_data = mapper.fit_transform(data, projection = [0]) # X-Y axis
    # Create dictionary called 'complex' with nodes, edges and meta-information
    complex = mapper.map(projected_X = projected_data, nr_cubes = nr_cube, overlap_perc = overlap)
    # Data treat
    ret = mapper.data_treat(complex, colored_variable = data_color, label_variable = data_label)
    return(ret)

#テーブルリスト取得
def get_table_names(db):
    db_list = []
    with sqlite3.connect(db) as conn:#テーブルリストを取得
        cur = conn.execute('select * from sqlite_master WHERE type="table"')
        for item in cur.fetchall():
            db_list.append(item[1])
        cur.close() #データベースを閉じる
    return db_list

#カラム名取得
def get_culumn_names(db, table):
    header = []
    with sqlite3.connect(db) as conn:#テーブルリストを取得
        cur = conn.execute("PRAGMA TABLE_INFO('%s')" % table)#ヘッダ取得
        for item in cur.fetchall():
            header.append(item[1])
        cur.close() #データベースを閉じる
    return header

#データ取得
def get_data_from_table(db, table):
    data = []
    with sqlite3.connect(db) as conn:#データ取得
        data = pd.io.sql.read_sql_query('select * from %s' % table, conn)
    return data

#テーブル作成
def create_table(db, data, table_name):
    with sqlite3.connect(db) as conn:
        psql.to_sql(data, str(table_name), conn, index = False, if_exists='replace')
        conn.commit() #データベース保存

#テーブルの情報を取得してjsonで返す
def selectedTableInfo2Json(table_name):
    json_db = {}
    table_list = []
    json_db["db"] = []
    json_db["selected"] = table_name
    table_list = get_table_names(db)
    for j in table_list:
        json_db["db"].append({"table":j, "header":get_culumn_names(db, j)})
    return json.dumps(json_db)



#ルーティング
@sockets.route('/data_load')
def dsta_socket(ws):
    while not ws.closed:
        message = ws.receive()
        message = json.loads(message) #受け取った文字列をjson化
        table_name = message["table"]
        ret = create_graph_data(data = table_name, nr_cube = int(message["nr_cube"]),
        overlap = float(message["overlap"]), colored_by = message["colored_by"] )
        ws.send(ret)

@sockets.route('/action')
def action(ws):
    while not ws.closed:
        message = ws.receive()
        message = json.loads(message) #受け取った文字列をjson化
        action = message["action"]
        table_name = message["table"]
        if action == "upload":
            table_name = table_name.split(".")[0]
            data = pd.read_json(json.dumps(message["data"]))
            create_table(db, data, table_name) #テーブル作成
        elif action == "selectTable":
            print("")
        ws.send(selectedTableInfo2Json(table_name))


@app.route("/")
def index():
    db_list = []
    header = []
    db_list = get_table_names(db)
    header = get_culumn_names(db, db_list[0])
    return render_template("index.html", tables = db_list, vals = header)

@app.route("/data")
def get_data():
    print(" ")


if __name__ == "__main__":
    server = pywsgi.WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()
