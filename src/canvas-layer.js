import L, { Layer } from 'leaflet'

// -- L.DomUtil.setTransform from leaflet 1.0.0 to work on 0.0.7
L.DomUtil.setTransform = L.DomUtil.setTransform || function(el, offset, scale) {
  var pos = offset || new L.Point(0, 0);

  el.style[L.DomUtil.TRANSFORM] =
    (L.Browser.ie3d ?
      'translate(' + pos.x + 'px,' + pos.y + 'px)' :
      'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') +
    (scale ? ' scale(' + scale + ')' : '');
};


/*
  Generic  Canvas Layer for leaflet 0.7 and 1.0-rc,
  copyright Stanislav Sumbera,  2016 , sumbera.com , license MIT
  originally created and motivated by L.CanvasOverlay  available here: https://gist.github.com/Sumbera/11114288

*/
export default class CanvasLayer extends Layer {

  // -- initialized is called on prototype
  initialize(options) {
    this._map = null;
    this._canvas = null;
    this._frame = null;
    this._delegate = null;
    L.setOptions(this, options);
  }

  delegate(del) {
    this._delegate = del;
    return this;
  }

  needRedraw() {
    if (!this._frame) {
      this._frame = L.Util.requestAnimFrame(this.drawLayer, this);
    }
    return this;
  }

  //-------------------------------------------------------------
  _onLayerDidResize(resizeEvent) {
    this._canvas.width = resizeEvent.newSize.x;
    this._canvas.height = resizeEvent.newSize.y;
  }
  //-------------------------------------------------------------
  _onLayerDidMove() {
    var topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    this.drawLayer();
  }
  //-------------------------------------------------------------
  getEvents() {
    var events = {
      resize: this._onLayerDidResize,
      moveend: this._onLayerDidMove,
      zoom: this._onLayerDidMove
    };
    if (this._map.options.zoomAnimation && L.Browser.any3d) {
      events.zoomanim = this._animateZoom;
    }

    return events;
  }
  //-------------------------------------------------------------
  onAdd(map) {

    this._map = map;
    this._canvas = L.DomUtil.create('canvas', 'leaflet-layer');
    this.tiles = {};

    var size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    var animated = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));


    map._panes.overlayPane.appendChild(this._canvas);

    map.on(this.getEvents(), this);

    var del = this._delegate.state || this.state;

    del.onLayerDidMount && del.onLayerDidMount(); // -- callback
    this.needRedraw();
  }

  //-------------------------------------------------------------
  onRemove(map) {
    var del = this._delegate || this;
    del.onLayerWillUnmount && del.onLayerWillUnmount(); // -- callback


    map.getPanes().overlayPane.removeChild(this._canvas);

    map.off(this.getEvents(), this);

    this._canvas = null;

  }

  //------------------------------------------------------------
  addTo(map) {
    map.addLayer(this);
    return this;
  }
  // --------------------------------------------------------------------------------
  LatLonToMercator(latlon) {
    return {
      x: latlon.lng * 6378137 * Math.PI / 180,
      y: Math.log(Math.tan((90 + latlon.lat) * Math.PI / 360)) * 6378137
    };
  }

  //------------------------------------------------------------------------------
  drawLayer() {
    // -- todo make the viewInfo properties  flat objects.
    var size = this._map.getSize();
    var bounds = this._map.getBounds();
    var zoom = this._map.getZoom();

    var center = this.LatLonToMercator(this._map.getCenter());
    var corner = this.LatLonToMercator(this._map.containerPointToLatLng(this._map.getSize()));

    var del = this._delegate.state || this.state;
    let info = {
      points: this._delegate.props.points,
      layer: this,
      canvas: this._canvas,
      bounds: bounds,
      size: size,
      zoom: zoom,
      center: center,
      corner: corner
    }
    this._delegate.state.info = info
    del.onDrawLayer && del.onDrawLayer(info);
    this._frame = null;
  }
  // -- L.DomUtil.setTransform from leaflet 1.0.0 to work on 0.0.7
  //------------------------------------------------------------------------------
  _setTransform(el, offset, scale) {
    var pos = offset || new L.Point(0, 0);

    el.style[L.DomUtil.TRANSFORM] =
      (L.Browser.ie3d ?
        'translate(' + pos.x + 'px,' + pos.y + 'px)' :
        'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)') +
      (scale ? ' scale(' + scale + ')' : '');
  }

  //------------------------------------------------------------------------------
  _animateZoom(e) {
    var scale = this._map.getZoomScale(e.zoom);
    // -- different calc of animation zoom  in leaflet 1.0.3 thanks @peterkarabinovic, @jduggan1
    var offset = L.Layer ? this._map._latLngBoundsToNewLayerBounds(this._map.getBounds(), e.zoom, e.center).min :
      this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

    L.DomUtil.setTransform(this._canvas, offset, scale);
  }

}

