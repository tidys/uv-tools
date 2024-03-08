import { Base64 } from "cc-plugin/src/ccp/util/base64";
import Color from "color";
import lerp from "lerp";
import { PointArray, SVG, Svg, Text, G, ArrayXY, Polygon, Circle, Polyline, Rect } from "@svgdotjs/svg.js";
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
  private opts: PainterOptions;
  public visiblePoint(b: boolean) {
    this._visiblePoint = b;
    if (!b) {
      this.removeInfoText();
    }
    this.circles.forEach((item) => {
      if (b) {
        item.node.show();
      } else {
        item.node.hide();
      }
    });
  }
  public init(opts: PainterOptions) {
    this.opts = opts;
    const { canvas, svg, root } = opts;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d");
    this.draw = SVG().addTo(svg);
    this.draw.on("click", (e: PointerEvent) => {
      e.stopPropagation();
      this.removeInfoText();
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === root) {
          const { width, height } = entries[0].contentRect;
          this.resize();
          this.removeInfoText();
          this._update();
        }
      }
    });
    observer.observe(root);

    this.resize();
    this.reset();

    if (false) {
      //   const points = new PointArray([0, 0, 100, 50, width - 10, 0]);
      //   this.drawLines(points);
    }
  }
  private resize() {
    const { width, height } = this.opts.root.getBoundingClientRect();
    this.width = width;
    this.height = height;
    this.canvas.setAttribute("width", width.toString());
    this.canvas.setAttribute("height", height.toString());
    this.draw.size(this.width, this.height);
  }
  private dotRadius = 6;
  private polygon: Polyline | null = null;
  private circles: Array<{ radius: number; node: Circle }> = [];
  /**
   *
   * @param str
   * @param step 一组数据的长度
   * @param offset 偏移量
   * @param len 数据的长度
   * 返回值为错误信息
   */
  public updatePoints(str: string, step: number = 4, offset: number = 2, len: number = 2): string {
    const points: number[] = [];
    const arr = str.split(",");
    for (let i = 0; i < arr.length; i++) {
      let item = arr[i];
      if (item.startsWith("\n")) {
        item = item.substring(1, item.length);
      }
      if (item) {
        const num = Number(item);
        if (Number.isNaN(num)) {
          return `顶点数据(${item})不是数字`;
        }

        points.push(num);
      }
    }

    const maxLen = points.length;
    if (maxLen % step !== 0) {
      return "数据长度必须能被step整除";
    }

    const newPoint: number[] = [];
    let curIndex = 0;
    // step by step
    while (curIndex < maxLen) {
      for (let i = 0; i < len; i++) {
        const index = curIndex + offset + i;
        if (index < maxLen) {
          let point = points[index];
          if (point > 1 || point < 0) {
            if (step == 2 && offset == 0) {
              return `顶点数据(${point})超过范围[0,1]`;
            } else {
              return `顶点数据(${point})超过范围[0,1]\n可能的原因:\n数据本身有问题\nstep(${step}) offset(${offset}) 参数设置异常导致`;
            }
          }
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
    return "";
  }
  public polygonLineWidth: number = 2;
  private drawPoints: PointArray = new PointArray();
  private drawLines(points: PointArray) {
    this.drawPoints = points;
    this._createDot();
    this.calcCenterOffset();
    this._update();
  }
  private _updateDot() {
    for (let i = 0; i < this.circles.length; i++) {
      const item = this.circles[i];
      const point = this.drawPoints[i]; // 虽然有可能对不上，但是概率都会很小
      const { radius } = item;
      item.node.move(point[0] - radius / 2 + this.offsetX, point[1] - radius / 2 + this.offsetY);
    }
  }
  private _createDot() {
    this.circles.map((item) => {
      item.node.remove();
    });
    this.circles = [];
    for (let i = 0; i < this.drawPoints.length; i++) {
      const point = this.drawPoints[i];
      console.log(`${i + 1}: ${point[0]}, ${point[1]}`);
      const percent = i / this.drawPoints.length;
      const radius = lerp(this.dotRadius, this.dotRadius * 2, percent);
      const item = this.draw.circle(radius);
      item.on("mouseenter", (e: PointerEvent) => {
        e.stopPropagation();
        this.removeInfoText();
        let info = `${i + 1}\nx:${point[0]}, y:${point[1]}\n`;
        info += `u:${point[0] / this.imageWidth}, v:${point[1] / this.imageHeight}`;

        const text = this.draw.text(info).stroke({ color: "red", width: 1 }).move(0, 0);

        const rect = text.node.getBoundingClientRect();
        const bg = this.draw.rect(rect.width, rect.height).fill("white");
        this.infoText = this.draw.group().add(bg).add(text).stroke("white");

        const offset = 6;
        let x = point[0] + offset + this.offsetX;
        x = Math.min(x, this.width - rect.width);
        let y = point[1] + offset + this.offsetY;
        y = Math.min(y, this.height - rect.height);
        this.infoText.move(x, y);
        this.infoText.on("click", (e: PointerEvent) => {
          e.stopPropagation();
        });
      });
      const color1 = Color("yellow");
      const destColor = color1.mix(Color("green"), percent);
      const colorHex = destColor.hex();
      item.css({ cursor: "pointer" }).fill(colorHex);
      this.circles.push({ radius: radius, node: item });
    }
    this.drawPoints.forEach((point) => {});
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
    this.polygon = this.draw.polyline([]);
    this.polygon.fill("none").stroke({ width: this.polygonLineWidth, color: "red" });
  }
  private imageWidth: number = 1;
  private imageHeight: number = 1;
  public hasImageData: boolean = false;
  private imgData: HTMLImageElement | null = null;
  public async drawImage(fullBase64: string): Promise<HTMLImageElement> {
    this.hasImageData = true;
    this.offsetX = 0;
    this.offsetY = 0;
    this.reset();
    this.imgData = await Base64.convertToImageData(fullBase64);
    this._update();
    return this.imgData;
  }
  private _update() {
    const { imgData } = this;
    if (imgData) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.drawImage(imgData, this.offsetX, this.offsetY, imgData.width, imgData.height);
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.strokeRect(this.offsetX, this.offsetY, imgData.width, imgData.height);
      this.imageWidth = imgData.width;
      this.imageHeight = imgData.height;
    }
    if (this.polygon) {
      if (this.drawPoints.length) {
        const newPoints: Array<ArrayXY> = [];
        this.drawPoints.map((point) => {
          newPoints.push([point[0] + this.offsetX, point[1] + this.offsetY]);
        });
        this.polygon.plot(newPoints);
      } else {
        this.polygon.plot([]);
      }
    }
    this._updateDot();
  }
  private offsetX = 0;
  private offsetY = 0;
  public repaintWithOffset(e: MouseEvent) {
    this.offsetX += e.movementX;
    this.offsetY += e.movementY;
    this.removeInfoText();
    this._update();
  }
  private calcCenterOffset() {
    const len = this.drawPoints.length;
    if (!len) {
      this.offsetX = this.offsetY = 0;
      return;
    }
    const [a, b] = this.drawPoints[0];
    let minX = a;
    let minY = b;
    let maxX = a;
    let maxY = b;
    for (let i = 0; i < len; i++) {
      const point = this.drawPoints[i];
      const [x, y] = point;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;
    this.offsetX = this.width / 2 - centerX;
    this.offsetY = this.height / 2 - centerY;
  }
  public resetRender() {
    this.removeInfoText();
    this.calcCenterOffset();
    this._update();
  }
}
export const painter = new Painter();
