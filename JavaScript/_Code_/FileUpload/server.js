var http = require('http')
var fs = require('fs')
var path = require('path')
var formidable = require('formidable')

var server = http.createServer(function (req, res) {
    // 1 设置cors跨域
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json')
    // 处理请求
    // 上传文件
    if (req.method === 'POST') {
        switch (req.url) {
            case '/upload': upload(req, res); break;
            case '/check/file': checkFile(req, res); break;
            case '/merge/file': mergeFile(req, res); break;
            default: res.end(JSON.stringify({ 'msg': '路径错误' })); break;
        }
    }
})

// 检查是否存在文件，实现秒传功能
function checkFile(req, res) {
    getPostParm(req).then(parm => {
        var hash = parm.hash
        var result = fileCache.get(hash)
        if (result === null) res.end(JSON.stringify({ 'msg': '服务器无该文件', url: null }))
        else if (result.state === '上传完成') res.end(JSON.stringify({ 'msg': '服务器存在该文件', url: result.url }))
        else if (result.state === '上传中') res.end(JSON.stringify({ 'msg': '文件未上传完成', start: result.start }))
    })
}

// 上传文件
function upload(req, res) {
    // 接受文件并处理
    var form = new formidable.IncomingForm()
    // 拼接临时文件夹，提前创建好的
    var dirTempPath = path.join(__dirname, 'upload', '__temp__')
    // 设置上传文件存放地点（临时）
    form.uploadDir = dirTempPath
    // 抛出错误
    form.on('error', err => { if (err) console.log(err) })
    form.parse(req, async (err, fields, files) => {
        var { hash, start, fileName } = fields
        var { file } = files
        // 创建一个以hash为名称的文件夹
        var dirPath = path.join(__dirname, 'upload', hash)
        // 创建一个以hash为名称的文件夹
        var createMsg = await createResource(dirPath, 'dir')
        // 剪切文件，通过修改文件路径实现，文件按数字排序
        var cutMsg = await cutFile(file.path, path.join(dirPath, start + ''))
        if (cutMsg === 'success' && createMsg === 'success') {
            fileCache.set(hash, { state: '上传中', start: start + '', fileName: fileName })
            res.end(JSON.stringify({ 'msg': '分片上传完成!' }))
        } else res.end(JSON.stringify({ 'msg': '分片失败!' }))
    })
}

// 合并文件
function mergeFile(req, res) {
    getPostParm(req).then(async parm => {
        var { hash, suffix } = parm
        var filePath = path.join(__dirname, 'upload', `${hash}.${suffix}`)
        var chunkDirPath = path.join(__dirname, 'upload', hash)
        // 创建一个空文件
        var createMsg = await createResource(filePath, 'file')
        if (createMsg === 'success') {
            // 判断文件个数
            //   分片的名称都是以数字按顺序命名的
            var chunkList = await getDirChunk(chunkDirPath)
            for (let i = 0; i < chunkList.length; i++) {
                var chunkPath = path.join(chunkDirPath, i + '')
                // 合并文件
                fs.appendFileSync(filePath, fs.readFileSync(chunkPath))
                // 删除分块，如果用异步会导致删除文件夹的时候文件夹里面还有文件
                fs.unlinkSync(chunkPath)
            }
            // 删除文件夹
            fs.rmdir(chunkDirPath, err => { if (err) console.log(err) })
            fileCache.set(hash, { state: '上传完成', url: filePath })
            res.end(JSON.stringify({ 'msg': '合并完成!' }))
        } else res.end(JSON.stringify({ 'msg': '失败!' }))
    })


}

// 操作fileCache.json，该json文件的作用是缓存文件hash值和文件名称，文件上传进度等信息
var fileCache = {
    url: path.join(__dirname, 'fileCache.json'),
    value: function () { return JSON.parse(fs.readFileSync(this.url, 'utf8').toString()) },
    get: function (hash = null) {
        var cache = this.value()
        // 没有传递参数全部返回
        if (hash === null) return cache
        // 查询不出来的返回null
        else return cache.hasOwnProperty(hash) ? cache[hash] : null
    },
    set: function (hash, values) {
        var cache = this.value()
        // 遍历出传入的参数，
        var keys = Object.keys(values)
        // 不存在则给个空对象
        if (!cache.hasOwnProperty(hash)) cache[hash] = {}
        // 修改
        keys.map(k => { cache[hash][k] = values[k] })
        fs.writeFile(this.url, JSON.stringify(cache), err => { if (err) console.log(err) })
    }
}
// 获取post方法的参数
function getPostParm(req) {
    return new Promise((resolve, reject) => {
        var body = ''
        req.on('data', function (chunk) {
            body += chunk
        })
        req.on('end', () => resolve(JSON.parse(body)))
    })
}
// 同步创建文件或文件夹并返回路径，存在则返回路径
function createResource(path, type) {
    return new Promise((resolve, reject) => {
        // 没找到指定的文件或者文件夹
        if (!fs.existsSync(path)) {
            // 创建文件夹
            if (type === 'dir') {
                fs.mkdir(path, { recursive: true }, err => {
                    if (err) reject(err)
                    else resolve('success')
                })
            }
            // 创建空文件
            else {
                fs.writeFile(path, '', err => {
                    if (err) reject(err)
                    else resolve('success')
                })
            }
        }
        // 存在该文件或者文件夹
        else resolve('success')
    })
}
// 剪切文件，把文件从临时文件夹剪切到以文件md5为名的文件夹中
function cutFile(oldPath, newPath) {
    return new Promise((resolve, reject) => {
        fs.rename(oldPath, newPath, err => {
            if (err) reject(err)
            else resolve('success')
        })
    })
}

// 获取指定文件夹的分片名称
function getDirChunk(dirPath) {
    return new Promise((resolve, reject) => {
        // 读取路径
        fs.readdir(dirPath, (err, files) => {
            if (err) reject(err)
            else resolve(files)
        })
    })
}

server.listen(3000)
console.log('启动端口：http://localhost:3000')