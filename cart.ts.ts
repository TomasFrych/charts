
import { AfterViewChecked, AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from "@angular/core";
import { WidgetContext } from "@modules/home/models/widget-component.models";
import * as Highcharts from 'highcharts';
import { take } from "rxjs";
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: "card-widget",
  templateUrl: "./card-widget.component.html",
  styleUrls: ["./card-widget.component.scss"],
  encapsulation: ViewEncapsulation.None,
})

export class CardWidgetComponent implements OnInit {
  @Input() ctx: WidgetContext;
  @ViewChild('chart') chart: ElementRef;
  @ViewChild('mainValueUnit') mainValueUnit: ElementRef;
  @ViewChild('mainValue') mainValueRef: ElementRef;
  @ViewChild('cardIconBox') cardIconBox: ElementRef;

  myChart: any;
  settings: any;
  cardTitle:string = 'title';
  trendzDomain: string;
  numbersAfterDecimal: number = 2;
  imageSource: any;

  Highcharts: typeof Highcharts = Highcharts;
  chartOptions: Highcharts.Options = {
    chart: {
      backgroundColor: 'transparent',
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    },
    title: {
      text: ''
    },
    credits: {
      enabled: false
    },
    xAxis: {
      visible: false
    },
    yAxis: {
      visible: false,
      minPadding: 0,
      maxPadding: 0
    },
    legend: {
      enabled: false
    },
    tooltip: {
      backgroundColor: 'transparent',
      formatter: function () {
        const date = new Date(this.point.x);
        const year = date.getFullYear();
        const month = date.getMonth().toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hour = date.getHours().toString().padStart(2, '0');
        const minute = date.getMinutes().toString().padStart(2, '0');
        const second = date.getSeconds().toString().padStart(2, '0');
        const transformedDate = `${year}/${month}/${day} ${hour}:${minute}:${second}`;

        return `<div class="tooltip-value">${this.point.y.toFixed(2)}</div> <br>  <div>${transformedDate}</div> `;
      },
      style: {
        color: '#ffffff',
        fontFamily: "Share Tech Mono"
      }
    },
    plotOptions: {
      spline: {
        lineWidth: 3,
        states: {
          hover: {
            lineWidth: 4
          }
        },
      }
    },
    series: [{
      type: 'spline',
      data: []
    }]
  }

  constructor(private domSanitizer: DomSanitizer){}

  ngOnInit(): void {
    this.ctx.$scope.cardWidget = this;
  }

  onInit() {
    this.settings = this.ctx.settings;
    this.trendzDomain = this.ctx.settings.trendzDomain
    this.numbersAfterDecimal = Number(this.ctx.settings.numbersAfterDecimal);

    if(this.ctx.widgetConfig.color){
      this.chartOptions.tooltip.style.color = this.ctx.widgetConfig.color;
      this.cardIconBox.nativeElement.style.backgroundColor = this.ctx.widgetConfig.color;
    }

    if(this.ctx.widgetConfig.title){
     this.cardTitle  = this.ctx.widgetConfig.title;
    };

    this.renderIcon(this.ctx.settings.markerImage);
    this.myChart = Highcharts.chart(this.chart.nativeElement, this.chartOptions);
    if (this.ctx.settings.idChartData) this.getChartData();
    if (this.ctx.settings.idMainValue) this.setMainValue();
  }

  onDataUpdated() { }

  onResize() { }

  onDestroy() { }

  onEditModeChanged() { }

  getChartData() {
    this.loadDataFromTrendz().pipe(take(1)).subscribe((result: any) => {
      const filtredLabel = this.ctx.data[0].dataKey.label;

      const dataTable = result.dataTable;
      
      let filteredValues = []
      for (const data of dataTable) {
        if (data[filtredLabel] !== null && data[filtredLabel] !== undefined) {
          const dataForDisplaying = [Number(data.Date), data[filtredLabel]]
          filteredValues.push(dataForDisplaying);
        }
      }

      filteredValues.sort((a, b) => {
        const dateA = new Date(a[0]); 
        const dateB = new Date(b[0]);
        return dateA.getTime() - dateB.getTime();
        }
      );

      this.myChart.series[0].update({
        data: filteredValues,
        color: this.ctx.data[0].dataKey.color,
      }, true)
    })
  }

  loadDataFromTrendz() {
    let requestObj = {
      viewConfigId: this.ctx.settings.idChartData,
      rangeStartTs: 0,
      rangeEndTs: 0,
      filters: {
        Building: [],
        Floor: [],
        Room: [],
      }
    };

    this.setFilters(requestObj);
    this.applyDashboardTime(requestObj);

    const url = `${this.trendzDomain}/apiTrendz/publicApi/buildReport?jwt=${this.getToken()}`;
    return this.ctx.http.post(url, requestObj);
  }

  getToken() {
    let jwtToken = localStorage.getItem("jwt_token");

    if (jwtToken) {
      jwtToken = jwtToken.replace(/"/g, "");
    }
    return jwtToken;
  }

  getMainValue() {
    let requestObj = {
      viewConfigId: this.ctx.settings.idMainValue,
      rangeStartTs: 0,
      rangeEndTs: 0,
      filters: {
        Building: [],
        Floor: [],
        Room: [],
      }
    };

    this.setFilters(requestObj);
    this.applyDashboardTime(requestObj);

    if (this.ctx.widgetConfig.color) {
      this.mainValueRef.nativeElement.style.color = this.ctx.widgetConfig.color;
    }

    const url = `${this.trendzDomain}/apiTrendz/publicApi/buildReport?jwt=${this.getToken()}`;
    return this.ctx.http.post(url, requestObj);
  }

  setMainValue() {
    this.getMainValue().pipe(take(1)).subscribe((value: any) => {
      const filtredLabel = this.ctx.data[0].dataKey.label;
      const dataTable = value.dataTable[0];
      let mainValue: number | undefined = undefined;
      if (dataTable) mainValue = dataTable[filtredLabel];

      if (mainValue !== null && mainValue !== undefined) {
        this.mainValueRef.nativeElement.textContent = (mainValue).toFixed(+this.numbersAfterDecimal);
        this.mainValueUnit.nativeElement.textContent = this.ctx.widgetConfig.units;
      }
    })
  }

  setFilters(requestObj) {
    if (this.ctx.settings.building) {
      requestObj.filters.Building = [this.ctx.settings.building];
    } else {
      if (this.ctx.dashboard.stateController.getStateParams().selected_room) requestObj.filters.Room = [this.ctx.dashboard.stateController.getStateParams().selected_room.entityName];

      if (this.ctx.dashboard.stateController.getStateParams().selected_floor) requestObj.filters.Floor = [this.ctx.dashboard.stateController.getStateParams().selected_floor.entityName];

      if (this.ctx.dashboard.stateController.getStateParams().selected_building) requestObj.filters.Building = [this.ctx.dashboard.stateController.getStateParams().selected_building.entityName];

    }
    return requestObj;
  }


  applyDashboardTime(requestObj) {
    let timeWindow = this.ctx.dashboard.dashboardTimewindow;
    if (timeWindow.realtime) {
      requestObj.rangeStartTs = Date.now() - timeWindow.realtime.timewindowMs;
      requestObj.rangeEndTs = Date.now();
    } else if (timeWindow.history) {
      if (timeWindow.history.fixedTimewindow && timeWindow.history.historyType === 1) {
        requestObj.rangeStartTs = timeWindow.history.fixedTimewindow.startTimeMs;
        requestObj.rangeEndTs = timeWindow.history.fixedTimewindow.endTimeMs;
      } else if (timeWindow.history.timewindowMs && timeWindow.history.historyType === 0) {
        requestObj.rangeStartTs = Date.now() - timeWindow.history.timewindowMs;
        requestObj.rangeEndTs = Date.now();
      }
    }
  }
  
  renderIcon(base64Data: string) {
    if(!base64Data) return;
    this.imageSource =  this.domSanitizer.bypassSecurityTrustResourceUrl(base64Data);
  }
}
