// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')

let schemeTemp = null
//添加检测单例代码第二实例调用退出接口
const isSingleLockApp = app.requestSingleInstanceLock()
if(!isSingleLockApp) {
  app.quit()
}

app.on('second-instance',(event,argv) => {
  //argv字段就是第二实例的process.argv
  handleArgv(argv)
})

let mainWindow
console.log('process.argv',process.argv)
function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // and load the index.html of the app.
  mainWindow.loadURL('https://www.baidu.com')
  mainWindow.once("ready-to-show",() => {
    mainWindow.show()
    if(schemeTemp) {
      mainWindow.webContents.send(`scheme_${schemeTemp.typeKey}`,schemeTemp.params)
    }
  })
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()
  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

app.on('open-url', (event, url) => {
  handleURL(url)
})
//由于macOS和windows系统注册自定义协议的参数不同所以创建一个函数处理注册

function setDefaultProtocol(scheme) {
  //判断系统
  if(process.platform === 'win32') {
    let args = []
    if(!app.isPackaged) {
      //开发阶段调试阶段需要将运行程序的绝对路径加入启动参数
      args.push(path.resolve(process.argv[1]))
    }
    //添加--防御自定义协议漏洞，忽略后面追加参数
    args.push('--')
    //判断是否已经注册
    if(!app.isDefaultProtocolClient(scheme,process.execPath, args)) {
      app.setAsDefaultProtocolClient(scheme,process.execPath, args)
    }
  }
  else {
    //判断是否已经注册
    if(!app.isDefaultProtocolClient(scheme)) {
      app.setAsDefaultProtocolClient(scheme)
    }
  }
}

setDefaultProtocol('st')


//根据process.argv获取自定义协议
function handleArgv(argv,scheme) {
  let offset = 1
  if(!app.isPackaged) {
    offset++
  } 
  let mySchemeURL = argv.find((item,index) => {
    return index >= offset && item.startsWith(`${scheme}://`)
  })
  console.log('自定义协议',mySchemeURL)
  handleURL(mySchemeURL)
  return mySchemeURL
}
//冷启动主进程代码执行直接在这里获取启动协议
handleArgv(process.argv)


function handleURL(url) {
  //利用URL类解析自定义协议，当然也可以自己写正则，因为大多数的自定协议都遵循'st://module?key1=value1&key2=value2'所以可以直接借助URL解析
  let obj = new URL(url)
  let typeKey = obj.pathname.slice(2)
  let params = obj.searchParams
  let data = {
    typeKey,
    params
  }
  //使用一个变量暂存
  schemeTemp = data
}
