import {defineConfig} from 'vite';
export default defineConfig({base:'/games/desk-racer/',build:{outDir:'../../public/games/desk-racer',emptyOutDir:true,target:'es2020'},resolve:{alias:{'../assets/vendor/GLTFLoader.js':'three/examples/jsm/loaders/GLTFLoader.js'}}});
