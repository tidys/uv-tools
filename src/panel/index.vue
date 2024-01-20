<template>
  <div class="panel">
    <div
      ref="rootEl"
      style="position: relative; flex: 1"
      @drop.prevent="drop"
      @dragover.prevent.stop
      @dragenter.prevent.stop
      @dragleave.prevent
    >
      <canvas ref="canvas" style="position: absolute; z-index: 1"></canvas>
      <div
        ref="svg"
        style="position: absolute; z-index: 2; overflow: hidden"
      ></div>
      <div
        style="
          position: absolute;
          z-index: 3;
          bottom: 0;
          right: 0;
          user-select: none;
        "
      >
        {{ msg }}
      </div>
    </div>
    <div
      style="
        flex: 1;
        height: 100%;
        display: flex;
        border-left: solid 1px black;
        flex-direction: column;
      "
    >
      <CCProp name="show point" align="left" tooltip="是否显示顶点">
        <CCCheckBox @change="onChangeVisiblePoint" :value="true"></CCCheckBox>
      </CCProp>
      <CCProp name="line width" tooltip="绘制多边形的线宽">
        <CCInputNumber
          v-model:value="polygonLineWidth"
          :min="0.1"
          :step="0.1"
          @change="onChangePolygonLineWidth"
        ></CCInputNumber>
      </CCProp>
      <CCProp name="step" tooltip="一组顶点数据的长度">
        <CCInputNumber
          :min="1"
          :step="1"
          v-model:value="step"
          @change="onVertexStepChange"
        ></CCInputNumber>
      </CCProp>
      <CCProp name="offset" tooltip="UV顶点的偏移量">
        <CCInputNumber
          :min="0"
          :step="1"
          v-model:value="vertexOffset"
          @change="onVertexOffsetChange"
        ></CCInputNumber>
      </CCProp>
      <CCProp name="count" tooltip="UV顶点的数量">
        <CCInputNumber
          :min="0"
          :step="1"
          v-model:value="vertexCount"
          @change="onVertexCountChange"
          :disabled="true"
        ></CCInputNumber>
      </CCProp>
      <CCProp name="vertex" tooltip="顶点数据"></CCProp>
      <CCTextarea
        style="margin-left: 12px"
        :data="points"
        @change="onTextareaChange"
      ></CCTextarea>
      <CCButton style="margin-left: 12px" @click="onClickBtn">show uv</CCButton>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, toRaw, ref, provide, nextTick } from "vue";
import PluginConfig from "../../cc-plugin.config";
import ccui from "@xuyanfeng/cc-ui";
import { painter } from "./painter";
import { Accept, Drop } from "cc-plugin/src/ccp/util/drop";
import profile, { Profile } from "cc-plugin/src/ccp/profile";
import { Base64 } from "cc-plugin/src/ccp/util/base64";
import CCP from "cc-plugin/src/ccp/entry-render";
const { CCInput, CCButton, CCTextarea, CCProp, CCInputNumber, CCCheckBox } =
  ccui.components;
const KEY_VERTICES = "vertices";
const KEY_POLYGON_LINE_WIDTH = "polygonLineWidth";
const KEY_VERTICES_OFFSET = "verticesOffset";
const KEY_VERTICES_STEP = "verticesStep";
const KEY_VERTICES_COUNT = "verticesCount";
const KEY_IMAGE = "image";
export default defineComponent({
  name: "index",
  components: { CCButton, CCTextarea, CCProp, CCInputNumber, CCCheckBox },
  setup(props, { emit }) {
    const svg = ref<HTMLElement>(null);
    const rootEl = ref<HTMLElement>(null);

    function updateImage(base64: string) {
      if (!base64) return;
      painter.drawImage(base64).then((el) => {
        msg.value = `width:${el.width},height:${el.height}`;
      });
    }
    onMounted(() => {
      if (!svg.value || !canvas.value || !rootEl.value) return;

      painter.init({
        root: rootEl.value as HTMLElement,
        canvas: canvas.value as HTMLCanvasElement,
        svg: svg.value as HTMLElement,
      });

      const imageData = saveData[KEY_IMAGE];
      updateImage(imageData);
    });
    const msg = ref(`拖拽纹理图片到这里`);
    const canvas = ref<HTMLCanvasElement>(null);

    const saveData = profile.load("uv-tools.json");
    const points = ref(saveData[KEY_VERTICES] || "");
    const step = ref(saveData[KEY_VERTICES_STEP] || 4);
    const vertexCount = ref(saveData[KEY_VERTICES_COUNT] || 2);
    const vertexOffset = ref(saveData[KEY_VERTICES_OFFSET] || 2);
    const polygonLineWidth = ref(saveData[KEY_POLYGON_LINE_WIDTH] || 2);
    painter.polygonLineWidth = polygonLineWidth.value;
    return {
      polygonLineWidth,
      vertexCount,
      vertexOffset,
      points,
      svg,
      rootEl,
      canvas,
      step,
      msg,
      onVertexCountChange(v: number) {
        saveData[KEY_VERTICES_COUNT] = v;
        profile.save(saveData);
      },
      onVertexStepChange(v: number) {
        saveData[KEY_VERTICES_STEP] = v;
        profile.save(saveData);
      },
      onVertexOffsetChange(v: number) {
        saveData[KEY_VERTICES_OFFSET] = v;
        profile.save(saveData);
      },
      onChangeVisiblePoint(v: boolean) {
        painter.visiblePoint(v);
      },
      onChangePolygonLineWidth(v: number) {
        saveData[KEY_POLYGON_LINE_WIDTH] = v;
        profile.save(saveData);
        painter.polygonLineWidth = v;
      },
      onTextareaChange(val: string) {
        if (val.startsWith("")) {
          val = val.substring(1, val.length);
        }
        if (val.endsWith("'")) {
          val = val.substring(0, val.length - 1);
        }
        const items = val.split(",").map((item) => item.trim());
        const arrayWith4 = [];
        const len = 4;
        // 变成4个一组
        while (items.length) {
          const ar = items.splice(0, len);
          arrayWith4.push(ar);
        }
        const result = arrayWith4.map((item) => {
          return item.join(", ");
        });
        let str = result.join(",\n");
        points.value = str;
        // save
        saveData[KEY_VERTICES] = str;
        profile.save(saveData);
      },
      onClickBtn() {
        if (!painter.hasImageData) {
          return;
        }
        const p: string = toRaw(points.value);
        painter.updatePoints(
          p,
          step.value,
          vertexOffset.value,
          vertexCount.value
        );
      },
      drop(event: DragEvent) {
        const drop = new Drop({
          multi: true,
          accept: [Accept.JSON, Accept.Texture],
          texture(name, data: ArrayBuffer) {
            const base64String = Base64.transformArrayBuffer(data);
            const fullBase64 = Base64.fillHead(base64String, "png");

            saveData[KEY_IMAGE] = fullBase64;
            profile.save(saveData);
            updateImage(fullBase64);
          },
        });
        drop.onWeb(event);
      },
    };
  },
});
</script>

<style scoped lang="less">
.panel {
  display: flex;
  flex-direction: row;
  height: 100%;
}
</style>