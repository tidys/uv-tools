import { Base64 } from "cc-plugin/src/ccp/util/base64";
import {
  PointArray,
  SVG,
  Svg,
  Text,
  G,
  ArrayXY,
  Polygon,
  Circle,
  Polyline,
  Rect,
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
  private infoText: G | null = null;
  private _visiblePoint: boolean = true;
  public visiblePoint(b: boolean) {
    this._visiblePoint = b;
    this.circles.forEach((item) => {
      if (b) {
        item.show();
      } else {
        item.hide();
      }
    });
  }
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
    this.draw.on("click", (e: PointerEvent) => {
      e.stopPropagation();
      this.removeInfoText();
    });
    this.reset();

    if (false) {
      const points = new PointArray([0, 0, 100, 50, width - 10, 0]);
      this.drawLines(points);
    }
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
  public polygonLineWidth: number = 2;
  private drawLines(points: PointArray) {
    if (this.polygon) {
      this.polygon.remove();
      this.circles.map((item) => {
        item.remove();
      });
      this.circles = [];
    }
    this.polygon = this.draw.polyline(points);
    this.polygon
      .fill("none")
      .stroke({ width: this.polygonLineWidth, color: "red" });
    let index = 0;
    points.forEach((point) => {
      console.log(`${++index}: ${point[0]}, ${point[1]}`);
      const item = this.draw.circle(this.dotRadius);
      item.on("click", (e: PointerEvent) => {
        e.stopPropagation();
        this.removeInfoText();
        let info = `${point.join(", ")}`;

        const text = this.draw
          .plain(info)
          .stroke({ color: "red", width: 1 })
          .move(0, 0);

        const rect = text.node.getBoundingClientRect();
        const bg = this.draw.rect(rect.width, rect.height).fill("white");
        this.infoText = this.draw.group().add(bg).add(text).stroke("white");

        const offset = 6;
        let x = point[0] + offset;
        x = Math.min(x, this.width - rect.width);
        let y = point[1] + offset;
        y = Math.min(y, this.height - rect.height);
        this.infoText.move(x, y);
        this.infoText.on("click", (e: PointerEvent) => {
          e.stopPropagation();
        });
      });
      item.css({ cursor: "pointer" });
      this.circles.push(item);
      item
        .move(point[0] - this.dotRadius / 2, point[1] - this.dotRadius / 2)
        .fill("yellow");
    });
    this.visiblePoint(this._visiblePoint);
  }
  private removeInfoText() {
    if (this.infoText) {
      this.infoText.remove();
    }
    this.infoText = null;
  }
  private reset() {
    this.draw.clear();
  }
  private imageWidth: number = 1;
  private imageHeight: number = 1;
  public hasImageData: boolean = false;
  public async drawImage(fullBase64: string): Promise<HTMLImageElement> {
    this.hasImageData = true;
    this.reset();
    const imgData = await Base64.convertToImageData(fullBase64);
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(imgData, 0, 0, imgData.width, imgData.height);
    this.imageWidth = imgData.width;
    this.imageHeight = imgData.height;
    return imgData;
  }
}
export const painter = new Painter();
