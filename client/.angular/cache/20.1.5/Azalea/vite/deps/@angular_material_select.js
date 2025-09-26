import {
  MAT_SELECT_CONFIG,
  MAT_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_SELECT_TRIGGER,
  MatSelect,
  MatSelectChange,
  MatSelectModule,
  MatSelectTrigger
} from "./chunk-XOPWCMDB.js";
import "./chunk-5MP5TH4C.js";
import "./chunk-RZ5AT5MR.js";
import {
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatPrefix,
  MatSuffix
} from "./chunk-VQ6UEPXF.js";
import "./chunk-6QQRA6RG.js";
import "./chunk-BPB7XNXO.js";
import {
  MatOptgroup,
  MatOption
} from "./chunk-ABWDHTJQ.js";
import "./chunk-WUQ2D5M5.js";
import "./chunk-KF3DN3J5.js";
import "./chunk-YZ7KVO6K.js";
import "./chunk-P4LFMSVZ.js";
import "./chunk-TZEA7G2T.js";
import "./chunk-KAPXTIMC.js";
import "./chunk-NEANUFBR.js";
import "./chunk-QCETVJKM.js";
import "./chunk-Z2LMX5J7.js";
import "./chunk-EOFW2REK.js";
import "./chunk-7YNU2LOE.js";
import "./chunk-5STY4K4A.js";
import "./chunk-IW7I3ULE.js";
import "./chunk-QVJ2TQXA.js";
import "./chunk-DBQVMHQU.js";
import "./chunk-DMSQSH77.js";
import "./chunk-G6ECYYJH.js";
import "./chunk-YVXMBCE5.js";
import "./chunk-RTGP7ALM.js";
import "./chunk-WDMUDEB6.js";

// node_modules/@angular/material/fesm2022/select.mjs
var matSelectAnimations = {
  // Represents
  // trigger('transformPanel', [
  //   state(
  //     'void',
  //     style({
  //       opacity: 0,
  //       transform: 'scale(1, 0.8)',
  //     }),
  //   ),
  //   transition(
  //     'void => showing',
  //     animate(
  //       '120ms cubic-bezier(0, 0, 0.2, 1)',
  //       style({
  //         opacity: 1,
  //         transform: 'scale(1, 1)',
  //       }),
  //     ),
  //   ),
  //   transition('* => void', animate('100ms linear', style({opacity: 0}))),
  // ])
  /** This animation transforms the select's overlay panel on and off the page. */
  transformPanel: {
    type: 7,
    name: "transformPanel",
    definitions: [
      {
        type: 0,
        name: "void",
        styles: {
          type: 6,
          styles: { opacity: 0, transform: "scale(1, 0.8)" },
          offset: null
        }
      },
      {
        type: 1,
        expr: "void => showing",
        animation: {
          type: 4,
          styles: {
            type: 6,
            styles: { opacity: 1, transform: "scale(1, 1)" },
            offset: null
          },
          timings: "120ms cubic-bezier(0, 0, 0.2, 1)"
        },
        options: null
      },
      {
        type: 1,
        expr: "* => void",
        animation: {
          type: 4,
          styles: { type: 6, styles: { opacity: 0 }, offset: null },
          timings: "100ms linear"
        },
        options: null
      }
    ],
    options: {}
  }
};
export {
  MAT_SELECT_CONFIG,
  MAT_SELECT_SCROLL_STRATEGY,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER,
  MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
  MAT_SELECT_TRIGGER,
  MatError,
  MatFormField,
  MatHint,
  MatLabel,
  MatOptgroup,
  MatOption,
  MatPrefix,
  MatSelect,
  MatSelectChange,
  MatSelectModule,
  MatSelectTrigger,
  MatSuffix,
  matSelectAnimations
};
//# sourceMappingURL=@angular_material_select.js.map
