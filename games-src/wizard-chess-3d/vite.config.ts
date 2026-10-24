import {defineConfig} from 'vite';
export default defineConfig({base:'/games/wizard-chess/',build:{outDir:'../../public/games/wizard-chess',emptyOutDir:true,target:'es2020'},resolve:{alias:{'../assets/vendor/GLTFLoader.js':'three/examples/jsm/loaders/GLTFLoader.js'}}});
