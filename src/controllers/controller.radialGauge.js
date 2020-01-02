import Chart from 'chart.js';

const { helpers } = Chart;

/**
 * Controller for the radialGauge chart type
 */

Chart.defaults._set('radialGauge', {
  animation: {
    // Boolean - Whether we animate the rotation of the radialGauge
    animateRotate: true,
    // Boolean - Whether we animate scaling the radialGauge from the centre
    animateScale: true
  },

  // The percentage of the chart that is the center area
  centerPercentage: 80,

  // Starting angle to draw arcs from
  rotation: Math.PI,

  // Sweep to allow arcs to cover
  circumference: Math.PI,

  // Padding around the chart (x-axis)
  paddingX: 0,

  // Padding around the chart (y-axis)
  paddingY: 0,

  // track options
  track: {
    // the color of the radial gauge's track
    color: 'rgb(204, 221, 238)',
    // track's border options
    border: {
      // track's border color
      color: 'rgb(204, 221, 238)',
      // track's border width
      width: 1
    }
  },

  // whether arc for the gauge should have rounded corners
  roundedCorners: true,

  // if more than one datapoint, set the padding of each arc
  arcPadding: (index, outerRadius, innerRadius) => 0,

  // center value options
  centerArea: {
    // whether to display the center text value
    displayText: true,
    // whether the text changes should be animated
    animateText: true,
    // font for the center text
    fontFamily: null,
    // color of the center text, special value 'fontColor' for dataset values
    fontColor: null,
    // the size of the center text, can be a function
    fontSize: null,
    // the y-offset of the center text, can be a function
    yOffset: 0,
    // padding around the center area
    padding: 4,
    // an image to use for the center background
    backgroundImage: null,
    // a color to use for the center background
    backgroundColor: null,
    // the text to display in the center
    // this could be a string or a callback that returns a string
    // if a callback is provided it will be called with (value, options)
    text: null
  },

  // radial scale options
  radialScale: {
    // is enabled
    enabled: true,
    // all ticket in range from 0 to 1 (percentage)
    ticks: [0, 1],
    // function to create label from value
    label: v => v,
    // the size of the tick text, can be a function
    fontSize : null,
    // label spacing
    spacing: 10
  },

  hover: {
    mode: 'single'
  },

  // disable mouse events
  events: [],

  legend: {
    display: false
  },

  // the domain of the metric
  domain: [0, 100],

  tooltips: {
    enabled: false,
    callbacks: {
      title() {
        return '';
      },
      label(tooltipItem, data) {
        let dataLabel = data.labels[tooltipItem.index];
        const value = `: ${data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index]}`;

        dataLabel += value;

        return dataLabel;
      }
    }
  }
});

// eslint-disable-next-line no-shadow
export default Chart => {
  Chart.controllers.radialGauge = Chart.DatasetController.extend({
    dataElementType: Chart.elements.RoundedArc,

    linkScales: helpers.noop,

    draw(...args) {
      this.drawTrack();

      this.drawCenterArea();

      if (this.chart.options.radialScale.enabled) {
        this.drawScale(this.chart.options);
      }

      Chart.DatasetController.prototype.draw.apply(this, args);
    },

    drawTrack() {
      const opts = this.chart.options;

      new Chart.elements.RoundedArc({
        _view: {
          backgroundColor: this.chart.options.track.color,
          borderColor: this.chart.options.track.border.color, //this.chart.options.trackColor,
          startAngle: opts.rotation,
          endAngle: opts.rotation + opts.circumference,
          x: this.centerX,
          y: this.centerY,
          innerRadius: this.innerRadius,
          outerRadius: this.outerRadius,
          borderWidth: this.chart.options.track.border.width,
          roundedCorners: opts.roundedCorners
        },
        _chart: this.chart
      }).draw();
    },

    drawCenterArea() {
      const ctx = this.chart.ctx;
      const drawInfo = {
        ctx,
        displayValue: this.getMeta().data.map(val => Math.ceil(val._view.value)),
        value: this.getMeta().data.map(val => Math.ceil(val._model.value)),
        radius: this.innerRadius,
        options: this.chart.options.centerArea
      };

      ctx.save();

      try {
        ctx.translate(this.centerX, this.centerY);
        if (drawInfo.options.draw) {
          drawInfo.options.draw(drawInfo);
          return;
        }

        if (drawInfo.options.backgroundColor) {
          this.drawCenterBackground(drawInfo);
        }

        if (drawInfo.options.backgroundImage) {
          this.drawCenterImage(drawInfo);
        }

        if (drawInfo.options.displayText) {
          this.drawCenterText(drawInfo);
        }
      } finally {
        ctx.restore();
      }
    },

    drawCenterBackground({ options, radius, ctx }) {
      const bgRadius = radius - options.padding;
      ctx.beginPath();
      ctx.arc(0, 0, bgRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = options.backgroundColor;
      ctx.fill();
    },

    drawCenterImage({ radius, options, ctx }) {
      const imageRadius = radius - options.padding;
      ctx.beginPath();
      ctx.arc(0, 0, imageRadius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        options.backgroundImage,
        -imageRadius,
        -imageRadius,
        2 * imageRadius,
        2 * imageRadius
      );
    },

    drawCenterText({ options, displayValue, value }) {
      const val = options.animateText ? displayValue : value;
      val.forEach((v, i) => {
        let fontSize = options.fontSize || `${(this.innerRadius / 100).toFixed(2)}em`;
        if (typeof fontSize === 'number') {
          fontSize = `${fontSize}px`;
        } else if (typeof fontSize === 'function') {
          fontSize = fontSize(this.innerRadius, i);
          if (Array.isArray(fontSize)) {
            fontSize = fontSize.map(fs => `${fs.toFixed(2)}px`);
          } else {
            fontSize = `${fontSize.toFixed(2)}px`;
          }
        }

        let yOffset = options.yOffset;
        if (typeof yOffset == 'function') {
          yOffset = `${yOffset(this.innerRadius, i)}`;
        }

        const fontFamily = options.fontFamily || Chart.defaults.global.defaultFontFamily;
        let color = options.fontColor || Chart.defaults.global.defaultFontColor;
        if (color === 'dataset') {
          color = this.getDataset().backgroundColor[i];
        }

        let text = typeof options.text === 'function' ? options.text(v, options) : options.text;
        text = text || `${v}`;
        this.chart.ctx.fillStyle = color;
        this.chart.ctx.textBaseline = 'middle';

        if (!Array.isArray(text)) {
          text = [text];
        }

        let textWidths = [];
        text.forEach((t, i) => {
          if (Array.isArray(fontSize)) {
            this.chart.ctx.font = `${fontSize[i]} ${fontFamily}`;
          } else {
            this.chart.ctx.font = `${fontSize} ${fontFamily}`;
          }
          const textMeasure = this.chart.ctx.measureText(t);
          textWidths.push(textMeasure.width);
        });

        const totalWidth = textWidths.reduce((a, b) => a + b, 0);
        let currentX = -Math.round(totalWidth / 2);
        text.forEach((t, i) => {
          this.chart.ctx.font = `${fontSize[i]} ${fontFamily}`;
          this.chart.ctx.fillText(t, currentX, -yOffset);
          currentX += textWidths[i];
        });
      });
    },

    drawScale(options) {
      const ctx = this.chart.ctx;
      ctx.save();

      try {
        ctx.translate(this.centerX, this.centerY);

        const opts = this.chart.options.radialScale;

        let fontSize = opts.fontSize || `${(this.innerRadius / 150).toFixed(2)}em`;
        if (typeof fontSize === 'number') {
          fontSize = `${fontSize}px`;
        } else if (typeof fontSize === 'function') {
          fontSize = `${fontSize(this.outerRadius, this.innerRadius)}px`;
        }

        const fontFamily = opts.fontFamily || Chart.defaults.global.defaultFontFamily;
        const color = opts.fontColor || Chart.defaults.global.defaultFontColor;
        this.chart.ctx.font = `${fontSize} ${fontFamily}`;
        this.chart.ctx.fillStyle = color;
        this.chart.ctx.textBaseline = 'middle';
        this.chart.ctx.textAlign = "center";

        let spacing = opts.spacing;
        if (typeof spacing === 'function') {
          spacing = spacing(this.outerRadius, this.innerRadius);
        }

        const domain = this.getDomain();
        for (let tick of opts.ticks) {
          const value = domain[0] + (domain[1] - domain[0]) * tick;
          const text = opts.label(value);
          const textSize = this.chart.ctx.measureText(text);
          const angleRad = this.chart.options.rotation + Math.PI * tick;
          const correction = this.rotateVector(textSize.width / 2, 0, angleRad);
          const { x, y } = this.rotateVector(this.outerRadius + spacing + textSize.width / 2, 0, angleRad);
          this.chart.ctx.fillText(text, x, y - correction.y);
        }
      } finally {
        ctx.restore();
      }
    },

    rotateVector(x, y, angleRad) {
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
      };
    },

    update(reset) {
      const chart = this.chart;
      const chartArea = chart.chartArea;
      const opts = chart.options;
      const arcOpts = opts.elements.arc;

      const paddingX = opts.paddingX;
      const paddingY = opts.paddingY;
      const availableWidth = chartArea.right - chartArea.left - arcOpts.borderWidth - paddingX;
      const availableHeight = chartArea.bottom - chartArea.top - arcOpts.borderWidth - paddingY;
      const availableSize = Math.min(availableWidth, availableHeight);

      const meta = this.getMeta();
      const centerPercentage = opts.centerPercentage;

      this.borderWidth = this.getMaxBorderWidth(meta.data);
      this.outerRadius = Math.max((availableSize - this.borderWidth) / 2, 0);
      this.innerRadius = Math.max(
        centerPercentage ? (this.outerRadius / 100) * centerPercentage : 0,
        0
      );

      const startAngle = opts.rotation;
      const endAngle = opts.rotation + opts.circumference;
      const bb = this.getArcBoundingBox(startAngle, endAngle, this.outerRadius, Math.max(paddingX, paddingY));
      const factorXY = { x: 1 / Math.abs(bb.w / bb.x), y: 1 / Math.abs(bb.h / bb.y) };
      const factor = Math.min(availableWidth / bb.w, availableHeight / bb.h);

      this.outerRadius *= factor;
      this.innerRadius *= factor;

      meta.total = this.calculateTotal();
      this.centerX = (chartArea.left + chartArea.right) * factorXY.x;
      this.centerY = (chartArea.top + chartArea.bottom) * factorXY.y;

      helpers.each(meta.data, (arc, index) => {
        this.updateElement(arc, index, reset, this.centerX, this.centerY);
      });
    },

    updateElement(arc, index, reset, centerX, centerY) {
      const chart = this.chart;
      const opts = chart.options;
      const animationOpts = opts.animation;
      const dataset = this.getDataset();

      const startAngle = opts.rotation;
      const value = reset && animationOpts.animateScale ? 0 : dataset.data[index]; 
      const arcAngle = reset && animationOpts.animateRotate ? 0 : this.calculateArcAngle(value);
      let endAngle = startAngle + arcAngle;

      if (endAngle > opts.rotation + opts.circumference) {
        endAngle = opts.rotation + opts.circumference;
      }

      const innerRadius = this.innerRadius;
      const outerRadius = this.outerRadius;
      const valueAtIndexOrDefault = helpers.valueAtIndexOrDefault;

      const arcPadding = typeof opts.arcPadding === 'function' ?
        opts.arcPadding(index, outerRadius, innerRadius) : opts.arcPadding;

      helpers.extend(arc, {
        // Utility
        _datasetIndex: this.index,
        _index: index,

        // Desired view properties
        _model: {
          x: centerX,
          y: centerY,
          startAngle,
          endAngle,
          outerRadius: outerRadius - arcPadding,
          innerRadius: innerRadius + arcPadding,
          label: valueAtIndexOrDefault(dataset.label, index, chart.data.labels[index]),
          roundedCorners: opts.roundedCorners,
          value
        }
      });

      const model = arc._model;

      // Resets the visual styles
      const custom = arc.custom || {};
      const valueOrDefault = helpers.valueAtIndexOrDefault;
      const elementOpts = this.chart.options.elements.arc;
      model.backgroundColor = custom.backgroundColor
        ? custom.backgroundColor
        : valueOrDefault(dataset.backgroundColor, index, elementOpts.backgroundColor);
      model.borderColor = custom.borderColor
        ? custom.borderColor
        : valueOrDefault(dataset.borderColor, index, elementOpts.borderColor);
      model.borderWidth = custom.borderWidth
        ? custom.borderWidth
        : valueOrDefault(dataset.borderWidth, index, elementOpts.borderWidth);

      arc.pivot();
    },

    calculateTotal() {
      return Math.max(...this.getDataset().data);
    },

    getDomain() {
      return this.chart.options.domain;
    },

    calculateArcAngle(value) {
      const [domainStart, domainEnd] = this.getDomain();
      const domainSize = domainEnd - domainStart;
      const circumference = this.chart.options.circumference;

      return domainSize > 0 ? circumference * (Math.abs(value - domainStart) / domainSize) : 0;
    },

    // gets the max border or hover width to properly scale pie charts
    getMaxBorderWidth(arcs) {
      let max = 0;
      const index = this.index;
      const length = arcs.length;
      let borderWidth;
      let hoverWidth;

      for (let i = 0; i < length; i++) {
        borderWidth = arcs[i]._model ? arcs[i]._model.borderWidth : 0;
        hoverWidth = arcs[i]._chart
          ? arcs[i]._chart.config.data.datasets[index].hoverBorderWidth
          : 0;

        max = borderWidth > max ? borderWidth : max;
        max = hoverWidth > max ? hoverWidth : max;
      }
      return max;
    },

    getArcBoundingBox(ini, end, radius, margin = 0) {
      // From: https://stackoverflow.com/questions/32365479/formula-to-calculate-bounding-coordinates-of-an-arc-in-space
      const PI = Math.PI;
      const HALF_PI = Math.PI / 2;
      const TWO_PI = Math.PI * 2;

      const getQuadrant = (_angle) => {
        const angle = _angle % (TWO_PI);

        if (angle > 0.0 && angle < HALF_PI) return 0;
        if (angle >= HALF_PI && angle < PI) return 1;
        if (angle >= PI && angle < PI + HALF_PI) return 2;
        return 3;
      };

      const iniQuad = getQuadrant(ini);
      const endQuad = getQuadrant(end);

      const ix = Math.cos(ini) * radius;
      const iy = Math.sin(ini) * radius;
      const ex = Math.cos(end) * radius;
      const ey = Math.sin(end) * radius;

      const minX = Math.min(ix, ex);
      const minY = Math.min(iy, ey);
      const maxX = Math.max(ix, ex);
      const maxY = Math.max(iy, ey);

      const r = radius;
      const xMax = [[maxX, r, r, r], [maxX, maxX, r, r], [maxX, maxX, maxX, r], [maxX, maxX, maxX, maxX]];
      const yMax = [[maxY, maxY, maxY, maxY], [r, maxY, r, r], [r, maxY, maxY, r], [r, maxY, maxY, maxY]];
      const xMin = [[minX, -r, minX, minX], [minX, minX, minX, minX], [-r, -r, minX, -r], [-r, -r, minX, minX]];
      const yMin = [[minY, -r, -r, minY], [minY, minY, -r, minY], [minY, minY, minY, minY], [-r, -r, -r, minY]];

      const x1 = xMin[endQuad][iniQuad];
      const y1 = yMin[endQuad][iniQuad];
      const x2 = xMax[endQuad][iniQuad];
      const y2 = yMax[endQuad][iniQuad];

      const x = x1 - margin;
      const y = y1 - margin;
      const w = x2 - x1 + margin * 2;
      const h = y2 - y1 + margin * 2;

      return { x, y, w, h };
    }
  });
};
