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
      <CCProp name="step" tooltip="一组顶点数据的长度">
        <CCInputNumber
          v-model:value="step"
          @change="onVertexStepChange"
        ></CCInputNumber>
      </CCProp>
      <CCProp name="offset" tooltip="UV顶点的偏移量">
        <CCInputNumber
          v-model:value="vertexOffset"
          @change="onVertexOffsetChange"
        ></CCInputNumber>
      </CCProp>
      <CCProp name="count" tooltip="UV顶点的数量">
        <CCInputNumber
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
import CCP from "cc-plugin/src/ccp/entry-render";
const { CCInput, CCButton, CCTextarea, CCProp, CCInputNumber } =
  ccui.components;
const KEY_VERTICES = "vertices";
const KEY_VERTICES_OFFSET = "verticesOffset";
const KEY_VERTICES_STEP = "verticesStep";
const KEY_VERTICES_COUNT = "verticesCount";

export default defineComponent({
  name: "index",
  components: { CCButton, CCTextarea, CCProp, CCInputNumber },
  setup(props, { emit }) {
    const svg = ref<HTMLElement>(null);
    const rootEl = ref<HTMLElement>(null);
    onMounted(() => {
      if (!svg.value || !canvas.value || !rootEl.value) return;
      painter.init({
        root: rootEl.value as HTMLElement,
        canvas: canvas.value as HTMLCanvasElement,
        svg: svg.value as HTMLElement,
      });
    });
    const msg = ref(`拖拽纹理到这里`);
    const canvas = ref<HTMLCanvasElement>(null);

    const saveData = profile.load("uv-tools.json");
    const points = ref(saveData[KEY_VERTICES] || "");
    const step = ref(saveData[KEY_VERTICES_STEP] || 4);
    const vertexCount = ref(saveData[KEY_VERTICES_COUNT] || 2);
    const vertexOffset = ref(saveData[KEY_VERTICES_OFFSET] || 2);
    return {
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
            painter.drawImage(data).then((el) => {
              msg.value = `width:${el.width},height:${el.height}`;
            });
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
