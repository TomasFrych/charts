import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnInit,
    ViewChild,
    ViewEncapsulation,
  } from "@angular/core";
  import { WidgetContext } from "@home/models/widget-component.models";
  import { Datasource, DatasourceData } from "@shared/public-api";
  
  import * as Highcharts from "highcharts";
  import MoreCharts from "highcharts/highcharts-more";
  
  MoreCharts(Highcharts);
  import { gaugeChartOptions } from "./chart-options";
  
  enum WidgetError {
    MISSING_DATASOURCES,
    MISSING_DATAKEYS,
  }
  
  @Component({
    selector: "mada-gauge-chart",
    templateUrl: "./gauge-chart.component.html",
    styleUrls: ["./gauge-chart.component.scss"],
    encapsulation: ViewEncapsulation.None,
  })
  export class GaugeChartComponent implements OnInit, AfterViewInit {
    @Input("ctx") ctx: WidgetContext;
  
    @ViewChild("gaugeContainer") gaugeContainerRef: ElementRef;
    @ViewChild("leftLegendItem") leftLegendItemRef: ElementRef;
    @ViewChild("rightLegendItem") rightLegendItemRef: ElementRef;
  
    data: DatasourceData[] = [];
    datasources: Datasource[] = [];
    entityId: string;
    settings: any;
  
    boiledValue = null;
    setpointValue = null;
    boiledLabel = null;
    setpointLabel = null;
    currentMin = 0;
  
    chart: Highcharts.Chart;
  
    constructor() {}
  
    ngAfterViewInit(): void {}
  
    ngOnInit() {
      this.ctx.$scope.GaugeChart = this;
  
      this.data = this.ctx.defaultSubscription.data;
      this.datasources = this.ctx.defaultSubscription.datasources;
      this.entityId = this.ctx.datasources[0]?.entityId;
      this.settings = this.ctx.settings;
  
      console.log({ ctx: this.ctx });
    }
  
    renderLegend() {
      const leftLegend = $(this.leftLegendItemRef.nativeElement);
      const rightLegend = $(this.rightLegendItemRef.nativeElement);
  
      const dataKey1 = this.data[0]?.dataKey;
      const dataKey2 = this.data[1]?.dataKey;
  
      if (!dataKey1) return;
  
      leftLegend.find("div").css({ color: dataKey1.color });
      leftLegend.find(".label").text(dataKey1.label);
      leftLegend.find(".unit").text(dataKey1.units ? " " + dataKey1.units : "");
  
      if (!dataKey2) return;
  
      rightLegend.find("div").css({ color: dataKey2.color });
      rightLegend.find(".label").text(dataKey2.label);
      rightLegend.find(".unit").text(dataKey2.units ? " " + dataKey2.units : "");
    }
  
    onInit() {
      const { enableTooltip, min, max, interval } = this.settings;
  
      const {
        color: gridColor,
        backgroundColor: background,
        title,
      } = this.ctx.widgetConfig;
  
      this.currentMin = min;
  
      this.chart = Highcharts.chart(
        this.gaugeContainerRef.nativeElement,
        gaugeChartOptions
      );
  
      this.renderLegend();
      this.updateValues();
  
      this.chart.update({
        chart: {
          backgroundColor: background || "#1C242E",
        },
        tooltip: {
          enabled: enableTooltip,
          formatter: function () {
            const total = min < 0 ? this.total - (0 - min) : this.total;
            return this.series.name + ":" + total;
          },
        },
        xAxis: {
          gridLineColor: gridColor || "red",
        },
        yAxis: {
          max: min < 0 ? max + (0 - min) : max || 12,
          gridLineColor: gridColor || "red",
          tickInterval: interval || (max - min) / 7,
          labels: {
            style: {
              color: gridColor || "red",
            },
            formatter: (a, b) => {
              return (min < 0 ? a.value - (0 - min) : a.value).toFixed(1);
            },
          },
        },
        series: [],
      });
  
      const dataKey1 = this.datasources[0]?.dataKeys[0];
      const dataKey2 = this.datasources[1]?.dataKeys[0];
  
      this.chart.addSeries({
        name: dataKey1.label || "Label 1",
        data: new Array(13).fill(0),
        color: dataKey1.color,
        pointWidth: dataKey1.settings.arcWidth || 12,
      });
  
      if (!dataKey2) return;
  
      this.chart.addSeries({
        name: dataKey2.label || "Label 2",
        data: new Array(13).fill(0),
        color: dataKey2.color,
        pointWidth: dataKey1.settings.arcWidth || 3,
      });
    }
  
    onDataUpdated() {
      if (
        this.datasources.length < 1 ||
        this.data.length < 1 ||
        this.data[0].data.length < 1
      )
        return;
  
      this.updateChart();
      this.updateValues();
    }
  
    updateValues() {
      const leftLegend = $(this.leftLegendItemRef.nativeElement);
      const rightLegend = $(this.rightLegendItemRef.nativeElement);
  
      const value1 = this.data[0]?.data[0]?.[1];
      const value2 = this.data[1]?.data[0]?.[1];
  
      if (!value1) return;
  
      leftLegend.find(".value").text(value1 ? " " + value1 : "");
  
      if (!value2) return;
  
      rightLegend.find(".value").text(value2 ? " " + value2 : "");
    }
  
    updateChart() {
      const { min, max } = this.settings;
  
      const series1 = this.chart.series[0];
      const series1Value = this.data[0]?.data[0]?.[1];
  
      const displayValue1 =
        series1Value > max ? max : series1Value < min ? min : series1Value - min;
  
      console.log({ series1Value });
      series1.data[1].update(displayValue1);
  
      const series2 = this.chart.series[1];
      const series2Value = this.data[1]?.data[0]?.[1];
  
      if (!series2 || series2Value === undefined || series2Value === null) return;
  
      const displayValue2 =
        series2Value > max ? max : series2Value < min ? min : series2Value - min;
  
      console.log({ series2Value });
      series2.data[5].update(displayValue2);
    }
  
    onResize() {}
    onDestroy() {}
  }
  