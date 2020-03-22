
// 显示文件上传，文件解析进度
var setTableInfo = {
    // 文件解析进度
    parse: function (percent) {
        this.calc('.parse_progress', percent)
    },
    // 文件上传进度
    upload: function (percent) {
        this.calc('.upload_progress', percent)
    },
    calc: function (dom_class, percent) {
        // 向上取整
        document.querySelector(dom_class).innerHTML = Math.ceil(percent * 100) + '%'
    }
}
// 请求接口
function request(param, url) {
    return new Promise((resolve, reject) => {
        var baseUrl = 'http://localhost:3000'
        // 上传文件用FormData传输
        if (url === '/upload') {
            var formData = new FormData()
            // Blob的二进制参数包裹在数组里面
            formData.append('file', new Blob([param.chunk]))
            formData.append('hash', param.hash)
            formData.append('start', param.start)
            formData.append('fileName', param.fileName)
            fetch(baseUrl + url, {
                method: "POST",
                body: formData
            })
                .then(response => resolve(response.json()))
                .catch(error => reject(error))
        } else {
            // 其他请求
            fetch(baseUrl + url, {
                method: "POST",
                body: JSON.stringify(param)
            })
                .then(response => resolve(response.json()))
                .catch(error => reject(error))
        }
    })
}
// 上传文件
var start_dom = document.querySelector('.upload')
start_dom.addEventListener('click', function () {
    isUpload = true
    // 创建一个隐藏的input[type='file']
    var upFileInput = document.createElement('input')
    upFileInput.setAttribute('type', 'file')
    upFileInput.setAttribute('size', '3')
    // 允许选择多个文件
    upFileInput.setAttribute('multiple', 'multiple')
    upFileInput.style.display = "none"
    document.body.appendChild(upFileInput)
    upFileInput.click()
    // 检测到有文件上传的时候上传文件
    upFileInput.addEventListener('change', async function () {
        let fileList = Object.values(upFileInput.files)
        // 没有上传文件则返回
        if (fileList.length === 0) return
        // 上传文件
        fileList.map(async file => {
            // 分片列表
            var { chunksList, fileHash } = await reader_file(file)
            // 上报文件的md5，用来检验该文件上传状态
            var checkFileMsg = await request({ hash: fileHash }, '/check/file')
            var start = 0, url = ''
            switch (checkFileMsg.msg) {
                //   从第一片开始上传
                case '服务器无该文件': start = 0; break;
                // 存在文件直接返回url
                case '服务器存在该文件': { start = 0; url = checkFileMsg.url } break;
                // 跳过已经上传的片段
                case '文件未上传完成': start = parseInt(checkFileMsg.start) + 1; break;
                default: start = 0; break;
            }
            if (url != '') {
                console.log('-----------文件已上传-----------')
                console.log(url)
                return
            }
            console.log(`本次文件从第${start}片开始上传`)
            var length = chunksList.length
            for (let i = start; i <= length; i++) {
                // 是否允许上传
                if (isUpload) {
                    var chunk = chunksList[i]
                    console.log(file)
                    await request({ chunk: chunk, hash: fileHash, start: i, fileName: file.name }, '/upload')
                    // 百分比的计算进度是小数点后两位，为了保证100%了还显示90%左右，所以判断下
                    var progress = (i === length ? 1 : i / length)
                    setTableInfo.upload(progress)
                }
            }
            // 合并文件
            if (isUpload) request({ hash: fileHash, suffix: file.name.split('.').pop() }, '/merge/file')
        })
        // 删除input
        let inputParentNode = upFileInput.parentNode
        inputParentNode.removeChild(upFileInput)
    })
})
// 取消上传
var cancel_dom = document.querySelector('.cancel')
var isUpload = true
cancel_dom.addEventListener('click', () => { isUpload = false })
// 读取文件
async function reader_file(file) {
    return new Promise((resolve, reject) => {
        // 处理slice兼容问题
        var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype
            .webkitSlice,
            // 限制大小2MB，每一片2MB
            chunkSize = 2 * 1024 * 1024,
            // 计算结果向上取整，获取切片数量，不足一片按照一片算
            chunks = Math.ceil(file.size / chunkSize),
            // 切片列表
            chunksList = [],
            //当前第0片
            currentChunk = 0,
            // 加密方法
            spark = new SparkMD5.ArrayBuffer(),
            // 读取完成
            reader_onload = function (e) {
                let result = e.target.result
                // 添加到缓存中
                spark.append(result)
                // 添加到切片列表中
                chunksList.push(result)
                // 读取下一片
                currentChunk++
                // 继续读取
                if (currentChunk < chunks) loadNext()
                // 读取完成
                else resolve({ chunksList: chunksList, fileHash: spark.end() })
            },
            // 读取错误
            reader_error = function (e) {
                console.log('读取错误！')
                reject(['读取错误！'])
            },
            // 切片方法
            loadNext = function () {
                var reader = new FileReader()
                reader.onload = reader_onload
                reader.error = reader_error
                // 读取起始位置，通过读取的片数
                var start = currentChunk * chunkSize,
                    // 是否为最后一片
                    tail = (start + chunkSize >= file.size ? true : false),
                    // 读取截至位置
                    // 最后一片的截至位置是文件的末尾，不足一片（2MB）按照一片算
                    // 2.1MB，第一片2MB，第二片0.1MB
                    end = (tail ? file.size : start + chunkSize)
                // 触发文件读取事件，文件切片
                reader.readAsArrayBuffer(blobSlice.call(file, start, end))
                // 展示百分比
                tail ? setTableInfo.parse(1) : setTableInfo.parse(start / file.size)
            }
        loadNext()
    })
}
