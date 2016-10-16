//Model
var Node = Backbone.Model.extend({
  defaults:{
    name:0,
    values:0,
    meanValue:0,
    Scaling_meanValue:0,
    type:"node"
  }
});

var Edge = Backbone.Model.extend({
  defaults:{
    source:0,
    target:0,
    type:"link"
  },
});

var Slider = Backbone.Model.extend({
  defaults:{
    min:0,
    max:1,
    step:0.01,
    name:"none"
  },
});

//Collection
var Nodes = Backbone.Collection.extend({
  model: Node
});
var Edges = Backbone.Collection.extend({
  model: Edge
});
var Sliders = Backbone.Collection.extend({
  model: Slider
});

//View
//ベースのビュー
var ChartBase = Backbone.View.extend({
  defaults: {
    xAttr: "x",
    yAttr: "y",
    margin: {top: 5, right: 5, bottom: 5, left: 5},
    width:300,
    height:300
  },
  initialize: function(options) {
    this.options = options || {};
    this.options = _.extend(this.defaults, this.options);
  },
  color30: function() {
    return d3.scale.ordinal()
    .domain(["0","1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
    "12", "13","14","15","16","17","18","19","20","21","22","23","24",
    "25","26","27","28","29","30"])
    .range(["#FF0000","#FF1400","#FF2800","#FF3c00","#FF5000",
    "#FF6400","#FF7800","#FF8c00","#FFa000","#FFb400","#FFc800",
    "#FFdc00","#FFf000","#fdff00","#b0ff00","#65ff00","#17ff00",
    "#00ff36","#00ff83","#00ffd0","#00e4ff","#00c4ff","#00a4ff",
    "#00a4ff","#0084ff","#0064ff","#0044ff","#0022ff","#0002ff",
    "#0100ff","#0300ff","#0500ff"]);
  },

  render: function() {
    var margin = this.options.margin;
    this.width = this.options.width - margin.left - margin.right;
    this.height = this.options.height - margin.top - margin.bottom;

    this.svg = d3.select(this.el).append("svg")
    .attr("width", this.width + margin.left + margin.right)
    .attr("height", this.height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    this.scales = {
      x: this.getXScale(),
      y: this.getYScale()
    };

    //rendering
    // this.renderAxes();
    this.renderData();
    return this;
  }
});

//ネットワークグラフ用のビュー
var NetworkGraph = ChartBase.extend({
  defaults: _.defaults({
  }, ChartBase.prototype.defaults),
  initialize: function(options) {
    this.options = options || {};
    this.options = _.extend(this.defaults, this.options);
  },
  getNodes: function() {
    return this.collection.nodes.filter(function(model) {
      return model.get('type') === 'node';
    });
  },
  getLinks: function() {
    return this.collection.edges.chain().filter(function(model) {
      return model.get('type') === 'link'
      && !_.isString(model.get('source'))
      && !_.isString(model.get('target'));
    }).map(function(model) {
      return model.toJSON();
    }).value();
  },
  screenReset: function() {
    d3.selectAll(".divs").remove();
    d3.selectAll(".tooltip").remove();
    d3.selectAll("svg").remove();
    d3.selectAll('.node')
    .remove()
    d3.selectAll('.link')
    .remove()
    var force = d3.layout.force();
    this.update(force);
  },
  update: function(force) {
    var nodes = this.getNodes(),
    links = this.getLinks();
    force.nodes(nodes).links(links);
    force.start();
  },
  renderGraph: function(svg, nodes, edges, force, width, height){
    //forcelayoutの初期設定
    force.nodes(nodes)
    .links(edges)
    .size([width, height])
    .linkDistance([100])
    .charge([-300])
    .start();

    //エッジ
    var edge = svg.selectAll("line")
    .data(edges)
    .enter()
    .append("line")
    .attr("class", "link");

    //ノード
    //マウスオーバーした時の枠
    var div = d3.select(this.el).append("div")
    .attr("class", "tooltip")
    .style("opacity", 0.0);

    var divs = d3.select(this.el).append('div')
    .attr('class', 'divs')
    .attr('style', function(d) {return 'overflow: hidden; width: ' + width + 'px; height: ' + height + 'px;'; });

    var node = divs.selectAll('div')
    .data(nodes)
    .enter()
    .append('div')
    .attr('class', 'node')
    .on("mouseover", function(d) {
      div.transition()
      .duration(200)
      .style("opacity", .9);
      div .html("metric: " +d3.format(".2f")(d.meanValue) +
      "<br>" + "label: " +d.labels+ "<br>")
      .style("left", (d3.event.pageX + 100) + "px")
      .style("top", (d3.event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      div.transition()
      .duration(500)
      .style("opacity", 0);
    })
    .call(force.drag());

    node.append("title")
    .text(function(d) {return d.name;});

    //グラフの更新
    force.on('tick', _.bind(this.onTick, this));
  },
  nodeStateChange: function(){
    var color = this.color30();
    var nodes = d3.selectAll(".node");

    var length_max = d3.max(this.collection.nodes.toJSON(), function(d){ //度数の最大値
      return d.values.length;
    });
    var max_size = d3.scale.linear()
    .domain([1, length_max])
    .range([4, 20]);

    nodes.attr("cx", function(d) {return d.x; })
    .attr("cy", function(d) { return d.y; })
    .attr('style', function(d) { return 'width: ' + (max_size(d.values.length)) +
    'px; height: ' + (max_size(d.values.length)) + 'px; ' +
    'left: '+(d.x-(max_size(d.values.length)*0.5))+'px; ' + 'top: '+(d.y-(max_size(d.values.length)*0.5))+
    'px; background: '+color(d.Scaling_meanValue)+
    '; box-shadow: 0px 0px 3px #111; box-shadow: 0px 0px 33px '+color(d.Scaling_meanValue)+
    ', inset 0px 0px 5px rgba(0, 0, 0, 0.2);'});
  },
  onTick: function() {//更新の設定
    this.nodeStateChange();

    var edges = d3.selectAll(".link");
    edges.attr('x1', function(d) {
      return d.source.x;
    }).attr('y1', function(d) {
      return d.source.y;
    }).attr('x2', function(d) {
      return d.target.x;
    }).attr('y2', function(d) {
      return d.target.y;
    });
  },
  renderGraph2: function(){
    var height = this.options.height;
    var width = this.options.width;
    var margin = this.options.margin;
    var nodes = this.collection.nodes.toJSON();
    var edges = this.collection.edges.toJSON();
    var color = this.color30();

    var length_max = d3.max(nodes, function(d){ //度数の最大値
      return d.values.length;
    });
    var max_size = d3.scale.linear()
    .domain([1, length_max])
    .range([2, 10]);

    var force = d3.layout.force()
    .charge(-200)
    .linkDistance(50)
    .size([width + margin.left + margin.right, height + margin.top + margin.bottom]);

    var zoom = d3.behavior.zoom()
    .scaleExtent([-20, 20])
    .on("zoom", zoomed);

    var mydrag = d3.behavior.drag()
    .origin(function(d) { return d; })
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);


    var svg = d3.select(this.el).append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.right + ")")
    .call(zoom)


    var rect = svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all");

    var container = svg.append("g");

    force
    .nodes(nodes)
    .links(edges)
    .start();

    //エッジ
    var link = container.append("g")
    .attr("class", "links")
    .selectAll(".link")
    .data(edges)
    .enter().append("line")
    .attr("class", "link")
    .style("stroke-width", function(d) { return Math.sqrt(2); });

    //ノード
    var node = container.append("g")
    .attr("class", "nodes")
    .selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; })
    .call(mydrag);

    node.append("circle")
    .attr("r", function(d) { return max_size(d.values.length); })
    .style("fill", function(d) { return color(d.Scaling_meanValue); })
    .on("mouseover", function(d) {
    })
    .on("mouseout", function(d) {
    })
    node.append("title")
    .text(function(d) {return d.name;});


    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    function zoomed() {
      container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this).classed("dragging", true);
      force.start();
    }

    function dragged(d) {
      d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    }

    function dragended(d) {
      d3.select(this).classed("dragging", false);
    }
  },
  renderGraph3: function(){
    var height = this.options.height;
    var width = this.options.width;
    var margin = this.options.margin;
    var nodes = this.collection.nodes.toJSON();
    var edges = this.collection.edges.toJSON();
    var color = this.color30(),
    shiftKey, ctrlKey;

    var length_max = d3.max(nodes, function(d){ //度数の最大値
      return d.values.length;
    });
    var max_size = d3.scale.linear()
    .domain([1, length_max])
    .range([2, 10]);

    var nodeGraph = null;
    var xScale = d3.scale.linear()
    .domain([0,width]).range([0,width]);
    var yScale = d3.scale.linear()
    .domain([0,height]).range([0, height]);

    var svg = d3.select(this.el)
    .attr("tabindex", 1)
    .on("keydown.brush", keydown)
    .on("keyup.brush", keyup)
    .each(function() { this.focus(); })
    .append("svg")
    .attr("width", width)
    .attr("height", height);

    var zoomer = d3.behavior.zoom()
    .scaleExtent([0.01, 20])
    .x(xScale)
    .y(yScale)
    .on("zoom", zoomed)
    .on("zoom", redraw);


    function zoomstart() {
      node.each(function(d) {
        d.selected = false;
        d.previouslySelected = false;
      });
      node.classed("selected", false);
    }

    function redraw() {
      vis.attr("transform",
      "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
    }

    var brusher = d3.svg.brush()
    //.x(d3.scale.identity().domain([0, width]))
    //.y(d3.scale.identity().domain([0, height]))
    .x(xScale)
    .y(yScale)
    .on("brushstart", function(d) {
      node.each(function(d) {
        d.previouslySelected = shiftKey && d.selected; });
      })
      .on("brush", function() {
        var extent = d3.event.target.extent();

        node.classed("selected", function(d) {
          return d.selected = d.previouslySelected ^
          (extent[0][0] <= d.x && d.x < extent[1][0]
            && extent[0][1] <= d.y && d.y < extent[1][1]);
          });
        })
        .on("brushend", function() {
          d3.event.target.clear();
          d3.select(this).call(d3.event.target);
        });

        var svg_graph = svg.append('svg:g')
        .call(zoomer)
        //.call(brusher)

        var rect = svg_graph.append('svg:rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        //.attr('opacity', 0.5)
        .attr('stroke', 'transparent')
        .attr('stroke-width', 1)
        //.attr("pointer-events", "all")
        .attr("id", "zrect")

        var brush = svg_graph.append("g")
        .datum(function() { return {selected: false, previouslySelected: false}; })
        .attr("class", "brush");

        var vis = svg_graph.append("svg:g");

        vis.attr('fill', 'red')
        .attr('stroke', 'black')
        .attr('stroke-width', 1)
        .attr('opacity', 0.9)
        .attr('id', 'vis')


        brush.call(brusher)
        .on("mousedown.brush", null)
        .on("touchstart.brush", null)
        .on("touchmove.brush", null)
        .on("touchend.brush", null);

        brush.select('.background').style('cursor', 'auto');

        var link = vis.append("g")
        .attr("class", "link")
        .selectAll("line");

        var node = vis.append("g")
        .attr("class", "node")
        .selectAll("circle");

        //エッジ
        edges.forEach(function(d) {
          d.source = nodes[d.source];
          d.target = nodes[d.target];
        });

        link = link.data(edges).enter().append("line")
        .attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

        var force = d3.layout.force()
        .charge(-120)
        .linkDistance(30)
        .nodes(nodes)
        .links(edges)
        .size([width, height])
        .start();

        //ノード
        node = node
        .data(nodes).enter().append("circle")
        .attr("r", function(d) { return max_size(d.values.length); })
        .style("fill", function(d) { return color(d.Scaling_meanValue); })
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })
        .on("dblclick", function(d) { d3.event.stopPropagation(); })
        .on("click", function(d) {
          if (d3.event.defaultPrevented) return;

          if (!shiftKey) {
            //if the shift key isn't down, unselect everything
            node.classed("selected", function(p) { return p.selected =  p.previouslySelected = false; })
          }

          // always select this node
          d3.select(this).classed("selected", d.selected = !d.previouslySelected);
        })
        .on("mouseup", function(d) {
          //if (d.selected && shiftKey) d3.select(this).classed("selected", d.selected = false);
        })
        .call(d3.behavior.drag()
        .on("dragstart", dragstarted)
        .on("drag", dragged)
        .on("dragend", dragended));

        force.on("tick", tick);


        function dragstarted(d) {
          d3.event.sourceEvent.stopPropagation();
          if (!d.selected && !shiftKey) {
            // if this node isn't selected, then we have to unselect every other node
            node.classed("selected", function(p) { return p.selected =  p.previouslySelected = false; });
          }
          d3.select(this).classed("selected", function(p) { d.previouslySelected = d.selected; return d.selected = true; });
          node.filter(function(d) { return d.selected; })
          .each(function(d) { d.fixed |= 2; })
        }

        function dragged(d) {
          node.filter(function(d) { return d.selected; })
          .each(function(d) {
            d.x += d3.event.dx;
            d.y += d3.event.dy;

            d.px += d3.event.dx;
            d.py += d3.event.dy;
          })
          force.resume();
        }

        function dragended(d) {
          //d3.select(self).classed("dragging", false);
          node.filter(function(d) { return d.selected; })
          .each(function(d) { d.fixed &= ~6; })
        }

        function tick() {
          link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

          node.attr('cx', function(d) { return d.x; })
          .attr('cy', function(d) { return d.y; });
        };

        function keydown() {
          shiftKey = d3.event.shiftKey || d3.event.metaKey;
          ctrlKey = d3.event.ctrlKey;

          // console.log('d3.event', d3.event)

        if (shiftKey) {
          svg_graph.call(zoomer)
          .on("mousedown.zoom", null)
          .on("touchstart.zoom", null)
          .on("touchmove.zoom", null)
          .on("touchend.zoom", null);

          //svg_graph.on('zoom', null);
          vis.selectAll('g.gnode')
          .on('mousedown.drag', null);

          brush.select('.background').style('cursor', 'crosshair')
          brush.call(brusher);
        }
      }

      function keyup() {
        shiftKey = d3.event.shiftKey || d3.event.metaKey;
        ctrlKey = d3.event.ctrlKey;

        brush.call(brusher)
        .on("mousedown.brush", null)
        .on("touchstart.brush", null)
        .on("touchmove.brush", null)
        .on("touchend.brush", null);

        brush.select('.background').style('cursor', 'auto')
        svg_graph.call(zoomer);
      }

      function zoomed() {
        svg_graph.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
      }

  },

    renderNetwork: function() {
      //画面初期化
      this.screenReset();

      // //変数の準備
      // var height = this.options.height;
      // var width = this.options.width;
      // var nodes = this.collection.nodes.toJSON();
      // var edges = this.collection.edges.toJSON();
      // var force = d3.layout.force();
      //
      //
      // //グラフサイズ
      // var svg = d3.select(this.el).append("svg")
      // .attr("width", width)
      // .attr("height", height)
      //
      // //レンダリング
      // this.renderGraph(svg, nodes, edges, force, width, height);
      this.renderGraph3();

      return this;
    }
  });

  //ヒストグラムのビュー
  var Histogram = ChartBase.extend({
    defaults: _.defaults({
      barPadding: 0.1,
      range:[0, 30],
      bins:[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
        15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]
      }, ChartBase.prototype.defaults),
      getXScale: function() {
        var padding = this.options.barPadding;
        return d3.scale.ordinal()
        .rangeRoundBands([0, this.width], padding)
        .domain(d3.range(this.options.bins.length));
      },
      getYScale: function() {
        return d3.scale.linear()
        .rangeRound([this.height, 0])
        .domain([0, 3])
        .range([0, this.height]);
      },
      getYScale_hist: function(max) {
        return d3.scale.linear()
        .rangeRound([this.height, 0])
        .domain([0, max])
        .range([0, this.height]);
      },
      setHistogram:function(){ // ヒストグラム
        return d3.layout.histogram()
        .range(this.options.range)
        .bins(this.options.bins);
      },
      renderAxes: function() {
        var xAxis = d3.svg.axis()
        .scale(this.scales.x)
        .orient("bottom")
        .ticks(5);

        var yAxis = d3.svg.axis()
        .scale(this.scales.y)
        .orient("left")
        .tickFormat(d3.format(".0%"));

        this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(xAxis);

        this.svg.append("g")
        .attr("class", "y axis")
        .call(yAxis);
      },

      renderData: function() {
        //変数
        var color = this.color30();
        var histogram = this.setHistogram();
        var nodes = this.collection.toJSON();
        var height = this.height;

        var hist_data = histogram(_.pluck(nodes, "Scaling_meanValue"))
        var hist_max = d3.max(hist_data, function(d){ //度数の最大値
          return d.length;
        });

        //スケール
        var chart = this,
        xScale = this.scales.x,
        yScale = this.getYScale_hist(hist_max);

        this.svg.selectAll("rect")
        .data(hist_data)
        .enter()
        .append("rect")
        .attr("x", function(d, i) {
          return xScale(i);
        })
        .attr("y", function(d) {
          return height - yScale(d.y);
        })
        .attr("width", xScale.rangeBand())
        .attr("height", function(d) {
          return yScale(d.y);
        })
        .attr("fill", function(d,i){    // 色を指定する
          return color(i);    // 色を返す
        });
      }
    });

    //スライダーのビュー
    var AddSlider = Backbone.View.extend({
      events: {
        'mousemove': 'changeValue',
        'change': 'changeValue'
      },
      changeValue: function(){
        var sl = document.getElementById(this.$el.children('input').attr("id"));
        var text = document.getElementById(this.$el.children('span').attr("id"));
        text.innerHTML = sl.value
      },
      getValue:function(){
        var sl = document.getElementById(this.$el.children('input').attr("id"));
        return sl.value;
      },
      renderSlider:function(){
        var slider = this.model;
        var name = slider.name
        var min = slider.min;
        var max = slider.max;
        var step = slider.step;
        var value = (max - min)/2.0;

        this.$el.append('<b>'+ name + '</b><br> <input type="range" id="' +name+ '_sl" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"> <br> <span id="'+name+'_val">'+value+'</span><br>');

        return this;
      }
    });

    //ボタンのビュー
    var AddBtn = Backbone.View.extend({
      events: {
        "click #upload_btn":"sendUpload",
        "click #create_btn":"sendParam"
      },
      sendParam: function(){//パラメータ送信
        var val_list_btn = document.getElementById("val_list_btn");
        var selectTableBtn = document.getElementById('table_list_btn');
        var table = selectTableBtn.options[selectTableBtn.selectedIndex].value;

        socket.send(
          JSON.stringify({"table":table, "overlap":add_overlap_sl.getValue(),
          "nr_cube":add_nr_cube_sl.getValue(),
          "colored_by":val_list_btn.options[val_list_btn.selectedIndex].value})
        );
      },
      sendUpload: function(){//アップロード
        var uploadFile = document.getElementById('file_btn');
        var file = uploadFile.files[0];
        var reader = new FileReader();

        reader.readAsText(file);
        reader.onload = function () {
          //json変換
          result_json = csv2json(reader.result);
          socket_action.send(JSON.stringify({"action":"upload", "table":file["name"], "data":result_json}));
        }
      },
      renderButton: function(){
        var name = this.model.name;
        this.$el.append('<button id="'+ name +'_btn">'+ name +'</button><br><br>');
        return this;
      },
      renderFileUploadButton: function(){
        var name = this.model.name;
        this.$el.append('<input type="file" id="'+ name +'_btn" />');
        return this;
      },

    });
