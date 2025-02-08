const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  lintOnSave: false,
  devServer: {
    port: 8081,
    proxy: {
      '^/api/auth': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true
      },
      '^/api': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      },
      '^/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
