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
    <CCTextarea
      style="min-height: 20px; height: 20px"
      v-model:data="points"
    ></CCTextarea>
    <CCButton @click="onClickBtn">btn click </CCButton>
  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted, toRaw, ref, provide, nextTick } from "vue";
import PluginConfig from "../../cc-plugin.config";
import ccui from "@xuyanfeng/cc-ui";
import { painter } from "./painter";
import { Accept, Drop } from "cc-plugin/src/ccp/util/drop";
const { CCInput, CCButton, CCTextarea } = ccui.components;
export default defineComponent({
  name: "index",
  components: { CCButton, CCTextarea },
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
    const msg = ref(PluginConfig.manifest.name);
    const canvas = ref<HTMLCanvasElement>(null);
    const points = ref(
      "-40, 40, 0.00390625, 0.0078125, 40, 40, 0.31640625, 0.0078125, -40, -40, 0.00390625, 0.6328125, 40, -40, 0.31640625, 0.6328125"
    );
    // const points = ref("0, 0, 100, 50, 200, 0 ");
    return {
      points,
      svg,
      rootEl,
      canvas,
      msg,
      onClickBtn() {
        console.log("click btn");
        const p:string = toRaw(points.value);
        painter.updatePoints(p);
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
  flex-direction: column;
  height: 100%;
}
</style>
