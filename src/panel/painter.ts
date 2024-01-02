import { Base64 } from "cc-plugin/src/ccp/util/base64";
import {
  PointArray,
  SVG,
  Svg,
  ArrayXY,
  Polygon,
  Circle,
  Polyline,
} from "@svgdotjs/svg.js";
export interface PainterOptions {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  svg: HTMLElement;
}
export class Painter {
  private width: number = 0;
  private height: number = 0;
  private draw: Svg;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public init(opts: PainterOptions) {
    const { canvas, svg, root } = opts;
    const { width, height } = root.getBoundingClientRect();
    this.width = width;
    this.height = height;
    this.canvas = canvas;
    this.canvas.setAttribute("width", width.toString());
    this.canvas.setAttribute("height", height.toString());
    this.ctx = this.canvas.getContext("2d");

    this.draw = SVG().addTo(svg).size(this.width, this.height);
    this.reset();
    // var rect = this.draw.rect(100, 100).attr({ fill: "#f06" });
    const points = new PointArray([0, 0, 100, 50, 200, 0]);
    this.drawLines(points);
  }
  private dotRadius = 6;
  private polygon: Polyline;
  private circles: Circle[] = [];
  /**
   *
   * @param str
   * @param step 一组数据的长度
   * @param offset 偏移量
   * @param len 数据的长度
   */
  public updatePoints(
    str: string,
    step: number = 4,
    offset: number = 2,
    len: number = 2
  ): boolean {
    const points: number[] = str.split(",").map((item) => Number(item));
    const maxLen = points.length;
    if (maxLen % step !== 0) {
      console.error("数据长度必须能被step整除");
      return false;
    }

    const newPoint = [];
    let curIndex = 0;
    // step by step
    while (curIndex < maxLen) {
      for (let i = 0; i < len; i++) {
        const index = curIndex + offset + i;
        if (index < maxLen) {
          let point = points[index];
          if (i === 0) {
            point *= this.imageWidth;
          } else if (i === 1) {
            point *= this.imageHeight;
          }
          newPoint.push(point);
        }
      }
      curIndex += step;
    }

    const pointArray = new PointArray(newPoint);
    this.drawLines(pointArray);
    return true;
  }
  private drawLines(points: PointArray) {
    if (this.polygon) {
      this.polygon.remove();
      this.circles.map((item) => {
        item.remove();
      });
      this.circles = [];
    }
    this.polygon = this.draw.polyline(points);
    this.polygon.fill("none").stroke({ width: 2, color: "red" });

    points.forEach((point) => {
      const item = this.draw.circle(this.dotRadius);
      this.circles.push(item);
      item
        .move(point[0] - this.dotRadius / 2, point[1] - this.dotRadius / 2)
        .fill("yellow");
    });
  }
  private reset() {
    this.draw.clear();
  }
  private imageWidth: number = 1;
  private imageHeight: number = 1;
  public async drawImage(data: ArrayBuffer): Promise<HTMLImageElement> {
    const base64String = Base64.transformArrayBuffer(data);
    const fullBase64 = Base64.fillHead(base64String, "png");
    const imgData = await Base64.convertToImageData(fullBase64);
    this.ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height);
    this.imageWidth = imgData.width;
    this.imageHeight = imgData.height;
    return imgData;
  }
}
export const painter = new Painter();
