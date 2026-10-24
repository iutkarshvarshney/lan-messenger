/* ═══════════════════════════════════════════════════════════
   LAN Messenger — Sticker Packs
   ═══════════════════════════════════════════════════════════ */

/* ── Image-based sticker packs (served from /stickers/) ─── */
const IMAGE_STICKER_PACKS = [
  {
    id: "gif-memes",
    name: "GIF Memes",
    icon: "🎬",
    stickers: [
      { id: "gif_meme_0", src: "/stickers/gif_memes/api_meme_gif_6.gif", label: "Meme 1" },
      { id: "gif_meme_1", src: "/stickers/gif_memes/pinterest_101894010314215954.gif", label: "Meme 2" },
      { id: "gif_meme_2", src: "/stickers/gif_memes/pinterest_1019713540639961201.gif", label: "Meme 3" },
      { id: "gif_meme_3", src: "/stickers/gif_memes/pinterest_1025483777634864312.gif", label: "Meme 4" },
      { id: "gif_meme_4", src: "/stickers/gif_memes/pinterest_1050464681848252825.gif", label: "Meme 5" },
      { id: "gif_meme_5", src: "/stickers/gif_memes/pinterest_106116134979082109.gif", label: "Meme 6" },
      { id: "gif_meme_6", src: "/stickers/gif_memes/pinterest_107453141098414272.gif", label: "Meme 7" },
      { id: "gif_meme_7", src: "/stickers/gif_memes/pinterest_1076008535945049660.gif", label: "Meme 8" },
      { id: "gif_meme_8", src: "/stickers/gif_memes/pinterest_10836855347448137.gif", label: "Meme 9" },
      { id: "gif_meme_9", src: "/stickers/gif_memes/pinterest_1096274734310267139.gif", label: "Meme 10" },
      { id: "gif_meme_10", src: "/stickers/gif_memes/pinterest_110901209566251982.gif", label: "Meme 11" },
      { id: "gif_meme_11", src: "/stickers/gif_memes/pinterest_114278909290915527.gif", label: "Meme 12" },
      { id: "gif_meme_12", src: "/stickers/gif_memes/pinterest_1143421792913792580_2491723471.gif", label: "Meme 13" },
      { id: "gif_meme_13", src: "/stickers/gif_memes/pinterest_114771490503794164.gif", label: "Meme 14" },
      { id: "gif_meme_14", src: "/stickers/gif_memes/pinterest_116178865381114365.gif", label: "Meme 15" },
      { id: "gif_meme_15", src: "/stickers/gif_memes/pinterest_1196337405430290.gif", label: "Meme 16" },
      { id: "gif_meme_16", src: "/stickers/gif_memes/pinterest_120963939986841366.gif", label: "Meme 17" },
      { id: "gif_meme_17", src: "/stickers/gif_memes/pinterest_127437864450802403.gif", label: "Meme 18" },
      { id: "gif_meme_18", src: "/stickers/gif_memes/pinterest_13229392650850591.gif", label: "Meme 19" },
      { id: "gif_meme_19", src: "/stickers/gif_memes/pinterest_135952482491591415.gif", label: "Meme 20" },
      { id: "gif_meme_20", src: "/stickers/gif_memes/pinterest_14144186313838618.gif", label: "Meme 21" },
      { id: "gif_meme_21", src: "/stickers/gif_memes/pinterest_149604018867964724.gif", label: "Meme 22" },
      { id: "gif_meme_22", src: "/stickers/gif_memes/pinterest_149604018868060002.gif", label: "Meme 23" },
      { id: "gif_meme_23", src: "/stickers/gif_memes/pinterest_15340454978408946.gif", label: "Meme 24" },
      { id: "gif_meme_24", src: "/stickers/gif_memes/pinterest_1548181178747151.gif", label: "Meme 25" },
      { id: "gif_meme_25", src: "/stickers/gif_memes/pinterest_1548181186693147.gif", label: "Meme 26" },
      { id: "gif_meme_26", src: "/stickers/gif_memes/pinterest_1548181186693160.gif", label: "Meme 27" },
      { id: "gif_meme_27", src: "/stickers/gif_memes/pinterest_1548181186693163.gif", label: "Meme 28" },
      { id: "gif_meme_28", src: "/stickers/gif_memes/pinterest_1548181186693164.gif", label: "Meme 29" },
      { id: "gif_meme_29", src: "/stickers/gif_memes/pinterest_1548181186693209.gif", label: "Meme 30" },
      { id: "gif_meme_30", src: "/stickers/gif_memes/pinterest_1548181186693213.gif", label: "Meme 31" },
      { id: "gif_meme_31", src: "/stickers/gif_memes/pinterest_159103799311154792.gif", label: "Meme 32" },
      { id: "gif_meme_32", src: "/stickers/gif_memes/pinterest_161707442865371505.gif", label: "Meme 33" },
      { id: "gif_meme_33", src: "/stickers/gif_memes/pinterest_164592561377964384.gif", label: "Meme 34" },
      { id: "gif_meme_34", src: "/stickers/gif_memes/pinterest_168110998582763073.gif", label: "Meme 35" },
      { id: "gif_meme_35", src: "/stickers/gif_memes/pinterest_168392473562780787.gif", label: "Meme 36" },
      { id: "gif_meme_36", src: "/stickers/gif_memes/pinterest_1688918606956129.gif", label: "Meme 37" },
      { id: "gif_meme_37", src: "/stickers/gif_memes/pinterest_1688918607234327.gif", label: "Meme 38" },
      { id: "gif_meme_38", src: "/stickers/gif_memes/pinterest_171699804538717829.gif", label: "Meme 39" },
      { id: "gif_meme_39", src: "/stickers/gif_memes/pinterest_17381148557916052.gif", label: "Meme 40" },
      { id: "gif_meme_40", src: "/stickers/gif_memes/pinterest_17381148558348486.gif", label: "Meme 41" },
      { id: "gif_meme_41", src: "/stickers/gif_memes/pinterest_178032991505581233.gif", label: "Meme 42" },
      { id: "gif_meme_42", src: "/stickers/gif_memes/pinterest_180355160074516331.gif", label: "Meme 43" },
      { id: "gif_meme_43", src: "/stickers/gif_memes/pinterest_182747697375786341.gif", label: "Meme 44" },
      { id: "gif_meme_44", src: "/stickers/gif_memes/pinterest_188940146844892143.gif", label: "Meme 45" },
      { id: "gif_meme_45", src: "/stickers/gif_memes/pinterest_193162271514702856.gif", label: "Meme 46" },
      { id: "gif_meme_46", src: "/stickers/gif_memes/pinterest_19492210989710091.gif", label: "Meme 47" },
      { id: "gif_meme_47", src: "/stickers/gif_memes/pinterest_19773685859478158.gif", label: "Meme 48" },
      { id: "gif_meme_48", src: "/stickers/gif_memes/pinterest_200058408445170518.gif", label: "Meme 49" },
      { id: "gif_meme_49", src: "/stickers/gif_memes/pinterest_211387776233449020.gif", label: "Meme 50" },
      { id: "gif_meme_50", src: "/stickers/gif_memes/pinterest_21955116930262789.gif", label: "Meme 51" },
      { id: "gif_meme_51", src: "/stickers/gif_memes/pinterest_220394975509662030.gif", label: "Meme 52" },
      { id: "gif_meme_52", src: "/stickers/gif_memes/pinterest_222435669075624028.gif", label: "Meme 53" },
      { id: "gif_meme_53", src: "/stickers/gif_memes/pinterest_222717144068780680.gif", label: "Meme 54" },
      { id: "gif_meme_54", src: "/stickers/gif_memes/pinterest_22447698135364104.gif", label: "Meme 55" },
      { id: "gif_meme_55", src: "/stickers/gif_memes/pinterest_226939268710159982.gif", label: "Meme 56" },
      { id: "gif_meme_56", src: "/stickers/gif_memes/pinterest_22729173116459433.gif", label: "Meme 57" },
      { id: "gif_meme_57", src: "/stickers/gif_memes/pinterest_23221754325023423.gif", label: "Meme 58" },
      { id: "gif_meme_58", src: "/stickers/gif_memes/pinterest_23643966772723378.gif", label: "Meme 59" },
      { id: "gif_meme_59", src: "/stickers/gif_memes/pinterest_2462974793319380.gif", label: "Meme 60" },
      { id: "gif_meme_60", src: "/stickers/gif_memes/pinterest_24769866696711210.gif", label: "Meme 61" },
      { id: "gif_meme_61", src: "/stickers/gif_memes/pinterest_25332816648862785.gif", label: "Meme 62" },
      { id: "gif_meme_62", src: "/stickers/gif_memes/pinterest_256986722467763592.gif", label: "Meme 63" },
      { id: "gif_meme_63", src: "/stickers/gif_memes/pinterest_26317979069560444.gif", label: "Meme 64" },
      { id: "gif_meme_64", src: "/stickers/gif_memes/pinterest_26317979069565373.gif", label: "Meme 65" },
      { id: "gif_meme_65", src: "/stickers/gif_memes/pinterest_26317979069623520.gif", label: "Meme 66" },
      { id: "gif_meme_66", src: "/stickers/gif_memes/pinterest_26317979069623544.gif", label: "Meme 67" },
      { id: "gif_meme_67", src: "/stickers/gif_memes/pinterest_268456827783169712.gif", label: "Meme 68" },
      { id: "gif_meme_68", src: "/stickers/gif_memes/pinterest_275634439690468998.gif", label: "Meme 69" },
      { id: "gif_meme_69", src: "/stickers/gif_memes/pinterest_288934132324799005.gif", label: "Meme 70" },
      { id: "gif_meme_70", src: "/stickers/gif_memes/pinterest_29132728835506287.gif", label: "Meme 71" },
      { id: "gif_meme_71", src: "/stickers/gif_memes/pinterest_306948530826727799.gif", label: "Meme 72" },
      { id: "gif_meme_72", src: "/stickers/gif_memes/pinterest_308918855712437470.gif", label: "Meme 73" },
      { id: "gif_meme_73", src: "/stickers/gif_memes/pinterest_311663236734361480.gif", label: "Meme 74" },
      { id: "gif_meme_74", src: "/stickers/gif_memes/pinterest_311874342940870732.gif", label: "Meme 75" },
      { id: "gif_meme_75", src: "/stickers/gif_memes/pinterest_315955730110048866.gif", label: "Meme 76" },
      { id: "gif_meme_76", src: "/stickers/gif_memes/pinterest_3166662233661758.gif", label: "Meme 77" },
      { id: "gif_meme_77", src: "/stickers/gif_memes/pinterest_32721534780124186.gif", label: "Meme 78" },
      { id: "gif_meme_78", src: "/stickers/gif_memes/pinterest_329325791521743544.gif", label: "Meme 79" },
      { id: "gif_meme_79", src: "/stickers/gif_memes/pinterest_34551122140780953.gif", label: "Meme 80" },
      { id: "gif_meme_80", src: "/stickers/gif_memes/pinterest_348536458665187240.gif", label: "Meme 81" },
      { id: "gif_meme_81", src: "/stickers/gif_memes/pinterest_35465915812933189.gif", label: "Meme 82" },
      { id: "gif_meme_82", src: "/stickers/gif_memes/pinterest_365073113523300803.gif", label: "Meme 83" },
      { id: "gif_meme_83", src: "/stickers/gif_memes/pinterest_36873290684839104.gif", label: "Meme 84" },
      { id: "gif_meme_84", src: "/stickers/gif_memes/pinterest_39899146690419677.gif", label: "Meme 85" },
      { id: "gif_meme_85", src: "/stickers/gif_memes/pinterest_400046379424689813.gif", label: "Meme 86" },
      { id: "gif_meme_86", src: "/stickers/gif_memes/pinterest_400046379424689815.gif", label: "Meme 87" },
      { id: "gif_meme_87", src: "/stickers/gif_memes/pinterest_40110252911062496.gif", label: "Meme 88" },
      { id: "gif_meme_88", src: "/stickers/gif_memes/pinterest_40813940366623606.gif", label: "Meme 89" },
      { id: "gif_meme_89", src: "/stickers/gif_memes/pinterest_416512665533058802.gif", label: "Meme 90" },
      { id: "gif_meme_90", src: "/stickers/gif_memes/pinterest_430797520601735578.gif", label: "Meme 91" },
      { id: "gif_meme_91", src: "/stickers/gif_memes/pinterest_444660163189829504.gif", label: "Meme 92" },
      { id: "gif_meme_92", src: "/stickers/gif_memes/pinterest_453456256253164801.gif", label: "Meme 93" },
      { id: "gif_meme_93", src: "/stickers/gif_memes/pinterest_45739752463143664.gif", label: "Meme 94" },
      { id: "gif_meme_94", src: "/stickers/gif_memes/pinterest_4601341914673826304.gif", label: "Meme 95" },
      { id: "gif_meme_95", src: "/stickers/gif_memes/pinterest_4644405861424965.gif", label: "Meme 96" },
      { id: "gif_meme_96", src: "/stickers/gif_memes/pinterest_487936940894856107.gif", label: "Meme 97" },
      { id: "gif_meme_97", src: "/stickers/gif_memes/pinterest_491596115548526898.gif", label: "Meme 98" },
      { id: "gif_meme_98", src: "/stickers/gif_memes/pinterest_500251471107524184.gif", label: "Meme 99" },
      { id: "gif_meme_99", src: "/stickers/gif_memes/pinterest_500251471113090682.gif", label: "Meme 100" },
      { id: "gif_meme_100", src: "/stickers/gif_memes/pinterest_502292164698343329.gif", label: "Meme 101" },
      { id: "gif_meme_101", src: "/stickers/gif_memes/pinterest_50665564555149378.gif", label: "Meme 102" },
      { id: "gif_meme_102", src: "/stickers/gif_memes/pinterest_521573200617677582.gif", label: "Meme 103" },
      { id: "gif_meme_103", src: "/stickers/gif_memes/pinterest_52354414415400379.gif", label: "Meme 104" },
      { id: "gif_meme_104", src: "/stickers/gif_memes/pinterest_5277724560169495.gif", label: "Meme 105" },
      { id: "gif_meme_105", src: "/stickers/gif_memes/pinterest_548031848401042806.gif", label: "Meme 106" },
      { id: "gif_meme_106", src: "/stickers/gif_memes/pinterest_5488830791802086.gif", label: "Meme 107" },
      { id: "gif_meme_107", src: "/stickers/gif_memes/pinterest_56295064087778171.gif", label: "Meme 108" },
      { id: "gif_meme_108", src: "/stickers/gif_memes/pinterest_566749934347337469.gif", label: "Meme 109" },
      { id: "gif_meme_109", src: "/stickers/gif_memes/pinterest_574209021212630262.gif", label: "Meme 110" },
      { id: "gif_meme_110", src: "/stickers/gif_memes/pinterest_577586720992573409.gif", label: "Meme 111" },
      { id: "gif_meme_111", src: "/stickers/gif_memes/pinterest_582653270556139612.gif", label: "Meme 112" },
      { id: "gif_meme_112", src: "/stickers/gif_memes/pinterest_597923288027928875.gif", label: "Meme 113" },
      { id: "gif_meme_113", src: "/stickers/gif_memes/pinterest_5981412002063213.gif", label: "Meme 114" },
      { id: "gif_meme_114", src: "/stickers/gif_memes/pinterest_599189925457597646.gif", label: "Meme 115" },
      { id: "gif_meme_115", src: "/stickers/gif_memes/pinterest_61009769944342757.gif", label: "Meme 116" },
      { id: "gif_meme_116", src: "/stickers/gif_memes/pinterest_61150507435553869.gif", label: "Meme 117" },
      { id: "gif_meme_117", src: "/stickers/gif_memes/pinterest_618752436357978738.gif", label: "Meme 118" },
      { id: "gif_meme_118", src: "/stickers/gif_memes/pinterest_625578204527284218.gif", label: "Meme 119" },
      { id: "gif_meme_119", src: "/stickers/gif_memes/pinterest_63191200999915186.gif", label: "Meme 120" },
      { id: "gif_meme_120", src: "/stickers/gif_memes/pinterest_651755377308192277.gif", label: "Meme 121" },
      { id: "gif_meme_121", src: "/stickers/gif_memes/pinterest_6544361955179978.gif", label: "Meme 122" },
      { id: "gif_meme_122", src: "/stickers/gif_memes/pinterest_6614730694083970.gif", label: "Meme 123" },
      { id: "gif_meme_123", src: "/stickers/gif_memes/pinterest_70157706731652152.gif", label: "Meme 124" },
      { id: "gif_meme_124", src: "/stickers/gif_memes/pinterest_703756189038661.gif", label: "Meme 125" },
      { id: "gif_meme_125", src: "/stickers/gif_memes/pinterest_70439181668627828.gif", label: "Meme 126" },
      { id: "gif_meme_126", src: "/stickers/gif_memes/pinterest_704743041667502731.gif", label: "Meme 127" },
      { id: "gif_meme_127", src: "/stickers/gif_memes/pinterest_715790934517817203.gif", label: "Meme 128" },
      { id: "gif_meme_128", src: "/stickers/gif_memes/pinterest_718042734330100812.gif", label: "Meme 129" },
      { id: "gif_meme_129", src: "/stickers/gif_memes/pinterest_752523419025412491_821275558.gif", label: "Meme 130" },
      { id: "gif_meme_130", src: "/stickers/gif_memes/pinterest_77053843622236390.gif", label: "Meme 131" },
      { id: "gif_meme_131", src: "/stickers/gif_memes/pinterest_77827899810654867.gif", label: "Meme 132" },
      { id: "gif_meme_132", src: "/stickers/gif_memes/pinterest_794040978089933968.gif", label: "Meme 133" },
      { id: "gif_meme_133", src: "/stickers/gif_memes/pinterest_808325833096558489.gif", label: "Meme 134" },
      { id: "gif_meme_134", src: "/stickers/gif_memes/pinterest_826551337841154565.gif", label: "Meme 135" },
      { id: "gif_meme_135", src: "/stickers/gif_memes/pinterest_827466131566831770.gif", label: "Meme 136" },
      { id: "gif_meme_136", src: "/stickers/gif_memes/pinterest_830843831233494872.gif", label: "Meme 137" },
      { id: "gif_meme_137", src: "/stickers/gif_memes/pinterest_85216617921001410.gif", label: "Meme 138" },
      { id: "gif_meme_138", src: "/stickers/gif_memes/pinterest_8725793025890153.gif", label: "Meme 139" },
      { id: "gif_meme_139", src: "/stickers/gif_memes/pinterest_892064638705567192_1767830513.gif", label: "Meme 140" },
      { id: "gif_meme_140", src: "/stickers/gif_memes/pinterest_9359111720714125.gif", label: "Meme 141" },
      { id: "gif_meme_141", src: "/stickers/gif_memes/pinterest_94364554686858916.gif", label: "Meme 142" },
      { id: "gif_meme_142", src: "/stickers/gif_memes/pinterest_945685621771741619.gif", label: "Meme 143" },
      { id: "gif_meme_143", src: "/stickers/gif_memes/pinterest_959477895659043345.gif", label: "Meme 144" },
      { id: "gif_meme_144", src: "/stickers/gif_memes/pinterest_966374032520716041.gif", label: "Meme 145" },
      { id: "gif_meme_145", src: "/stickers/gif_memes/pinterest_98445941850812300.gif", label: "Meme 146" },
      { id: "gif_meme_146", src: "/stickers/gif_memes/pinterest_988962399454999056.gif", label: "Meme 147" },
      { id: "gif_meme_147", src: "/stickers/gif_memes/pinterest_99712579247626280.gif", label: "Meme 148" },
      { id: "gif_meme_148", src: "/stickers/gif_memes/pinterest_999658448538494670.gif", label: "Meme 149" }
    ]
  }
];


/* ── Lookup helpers ─────────────────────────────────────────── */

/**
 * Find an image sticker by packId:stickerId
 */
function getImageStickerById(packId, stickerId) {
  const pack = IMAGE_STICKER_PACKS.find(p => p.id === packId);
  if (!pack) return null;
  return pack.stickers.find(s => s.id === stickerId) || null;
}

/**
 * Parse a sticker message string.
 * Format: __STICKER__:packId:stickerId
 * Format: __IMGSTICKER__:packId:stickerId
 */
function parseStickerMessage(content) {
  if (!content) return null;

  if (content.startsWith('__IMGSTICKER__:')) {
    const parts = content.split(':');
    if (parts.length !== 3) return null;
    const s = getImageStickerById(parts[1], parts[2]);
    if (!s) return null;
    return { type: 'image', ...s };
  }

  return null;
}
