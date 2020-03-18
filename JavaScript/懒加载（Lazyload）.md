# 懒加载（Lazy Load）

由于媒体资源在被下载完成后，浏览器必须对它进行解码，然后渲染在视窗上，大量的媒体资源会导致页面卡顿，避免大量的图片或者视频渲染在页面上能有效的提升性能。

懒加载的原理就是不加载或者占位离开可视范围内的资源，只加载可视范围内的媒体资源

## 检查元素是否在可视范围内

堪比连连看的散装属性：

![散装属性](_images_/20200302162937802_18562.png =700x)


通常判断元素是否在可视范围内的方法是：
元素距dom边框的距离<（可见区域高度/宽度）+（滚动条距离顶部高度，也是被隐藏的高度）

```
element.offsetTop<document.documentElement.clientHeight-
(document.documentElement.scrollTop || document.body.scrollTop)
```

* 声明了DTD（文档类型定义）使用document.documentElement.scrollTop，未声明DTD.使用document.body.scrollTop
* 缺点是offsetTop是返回最近的相对定位的父元素，现代点的方法是使用Element.getBoundingClientRect()。

东西是全了，但是使用这些散装属性判断是否在可视范围内未免太麻烦了点，有的属性包含border，有的属性不包含border，有的是给元素使用有的是给document，body对象使用，搜索引擎一搜这些东西就是一大串的文档，演示gif，本着**太长的东西不看**的原则（而且大部分属性方法还相似，nmd为什么！），而且scroll事件密集发生，计算量很大，容易造成性能问题。所以强烈推荐[Intersection Observer API](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)。

### Intersection Observer API

[polyfill（getBoundingClientRect实现）](https://github.com/w3c/IntersectionObserver)，浏览器不支持时可以引用这个

`Intersection Observer API`是一个异步观察目标元素在指定的可视范围内`可视性`变化的方法。
可视范围：
![Viewport](_images_/20200303204005182_26579.png =500x)
使用方法很简单：

```javascript
var container = document.querySelector('.container')
var foo = document.querySelector('.foo')
var bar = document.querySelector('.bar')

var io = new IntersectionObserver((entries) => {
    console.log('entries: ', entries);
}, {
    root: container,
    threshold: 0
})

io.observe(bar) // 开始观察指定的观察对象
io.unobserve(bar) // 停止观察指定的观察对象
io.disconnect() // 关闭所有观察器
```

#### callback

IntersectionObserver的构造函数接受两个参数，一个是callback，一个是options(可选)。
callback是当元素可见比例超过指定阈值时调用的回调函数。经过实际测试，每次进去不可避免的执行一次这个回调，但是MDN和其他资料并没有注明，不过可以通过callback的参数里面的isIntersecting属性判断元素是否可见。

callback返回的参数有七个属性：

1. boundingClientRect：目标元素的矩形信息，非矩形的元素则是一个最小矩形，值和getBoundingClientRect一样，里面是矩形各条边距可视区边缘的距离，以及实际宽高（包括padding，margin，border），且值为浮点数。
2. intersectionRect：目标元素和可视范围相交的矩形的信息。
3. intersectionRatio：相交区域矩形和元素的矩形比例。
4. isIntersecting：是否可见，不全部可见也为true。
5. rootBounds：根元素（指定的可视范围，不指定就是当前视窗范围）的矩形信息。
6. target：观察的目标元素
7. time：相交发生时距离页面打开时的毫秒数（小数）

#### options
options整个参数对象以及它的三个属性都是可选的

1. root：一个可以**滚动**的元素，通常称为根元素，用处是判断他的后代元素是否进入他的可视范围内。
2. threshold：目标元素和根元素相交时，用相交的面积除以目标元素的面积会得到一个 0 到 1（0% 到 100%）的数值，可以指定多个值，默认为0，0代表只要目标元素出现在可视范围内就执行回调，1代表目标元素全部出现在可视范围内才执行回调。
3. rootMagin：这个边距是给矩形元素添加的，用处是可以让目标元素在接近根元素的可视范围内时提前触发回调。

![rootMagin](_images_/20200303204827122_32278.png =500x)

## 离屏内容使用占位资源

![skeleton](_images_/20200305125936273_12606.gif =1000x)

有了IntersectionObserver实现只加载可视范围内的内容简直不要太简单

html结构

```html
<ul class="list">
    <li class="item">
        <!-- 占位符 -->
        <div class="skeleton" style="display: none;">
            <h1>加载中...</h1>
        </div>
        <img src="./img.jpg" alt="英雄特纳尔一定要实现">
        <h1>英雄特纳尔一定要实现</h1>
    </li>
</ul>
```

用js添加50个li.item

```javascript
var list = document.querySelector('.list')
for (let i = 0; i < 50; i++) {
    let item = document.querySelector('.item').cloneNode(true)
    list.appendChild(item)
}
```

观察是否在可视范围内

```javascript
// 初始化数据
var list = document.querySelector('.list')
for (let i = 0; i < 50; i++) {
    let item = document.querySelector('.item').cloneNode(true)
    list.appendChild(item)
}
// 观察在可视范围内
var io = new IntersectionObserver((entries) => {
    // 判断所有实例的显示状态
    entries.map(item => {
        if (item.isIntersecting) {
            // 在可视范围内正常显示
            item.target.classList.remove('skeletonContainer')
        } else {
            // 全部不可视后用占位元素代替
            item.target.classList.add('skeletonContainer')
        }
    })

}, {
    root: list,
    threshold: [0, 1]
})
var itemList = Array.from(document.querySelectorAll('.item'))
// 观察所有的列表子项
itemList.map(item => io.observe(item))
```

使用IntersectionObserver轻轻松松代替之前计算scroll的方法实现这些功能，代码即简洁而且还具有可读性（那些相似的属性方法一会不用就忘记了），如果使用监听scroll事件还需要手动写一个节流函数避免scroll事件重复运行。

## 无限滚动

![InfinityScroll](_images_/20200306171345644_27083.gif =900x)

当然IntersectionObserver不是万能的，计算滚动条的方法也不是一点用都没有，还有一种懒加载的方式是可视范围内的元素个数恒定，通常使用在手机端上。

无限滚动有个细微的处理就是预先计算所有元素计算其高度，让后在可滚动的根元素里面创建一个同高度的占位元素。内容在根元素绝对定位，由于根元素的滚动条被撑开，拉动滚动条时改变内容的top或者left定位属性，这样就不会出现添加元素导致滚动条闪动等问题。

```html
<div class="InfinityScroll">
    <div class="broaden"></div>
    <ul class="show"> </ul>
</div>
```
![示例](_images_/20200306165426916_10325.png =800x)
```javascript
// 模拟100条数据，填充数组
var count = 0
var list = Array.from({ length: 100 }, () => count++)
var liHeight = 30, // 单个li高度
    liMarginTop = 10, // li的marginTop
    viewHeight = 500, // 视口高度
    ulLength = Math.ceil(viewHeight / (liHeight + liMarginTop)), // 可视范围内盛放的li个数
    ulHeight = list.length * liHeight + (list.length + 1) * liMarginTop // 所有li高度和margin之和，broaden的高度
```

为了代码主体逻辑不被操作dom等代码淹没，这里面使用了Proxy，实现改变值就可以操作dom

```javascript
// proxy通过数据改变页面，分离代码逻辑主体和分支
var UIState = {
    ulList: list.slice(0, ulLength), // 可视范围内的列表
    ulTop: 0 // 可视范围的列表的定位
}

var UIStateProxy = new Proxy(UIState, {
    get: function (target, key) {
        return target[key]
    },
    set: function (target, key, value) {
        target[key] = value
        switch (key) {
            case 'ulList':
                var ulList = document.querySelector('.show')
                // 清空子节点
                while (ulList.hasChildNodes()) ulList.removeChild(ulList.firstChild)
                // 重新添加节点
                value.map(v => {
                    var ulList = document.querySelector('.show')
                    var li = document.createElement('li')
                    li.className = 'item'
                    li.innerText = v
                    ulList.appendChild(li)
                })
                break;
            case 'ulTop':
                // 设置ul的top
                var ulList = document.querySelector('.show')
                ulList.setAttribute('style', `top:${value}px`)
                break;

            default:
                console.log('无此属性');
                break;
        }
    }
})
```
在计算ul的定位时有个bug需要留意下，就是每次改变ul时第一个li因为新添加进去的，所以必定全部在可视范围内，当滚动条滚动的位置只够第一个li露出一部分时仍然全部显示，所以每次计算ul的top时需要减去这部分高度`scrollTop - (scrollTop % (liHeight + liMarginTop))`。

滚动条拉动的距离实际只能让8显示一部分

![正常情况](_images_/20200306170436592_9153.png =300x)

但是因为每次重新添加li会导致8全部显示

![错误情况](_images_/20200306170422392_24820.png =300x)

```javascript
// 监听滚动条
var InfinityScroll = document.querySelector('.InfinityScroll')
InfinityScroll.addEventListener('scroll', () => {
    // 获取滚动条滚动的高度
    var scrollTop = InfinityScroll.scrollTop
    // 设置ul的定位，因为根据滚动条滚动的内容设置ul的内容，
    // 会导致只露出li一部分的时候会重新排版li，导致ul的定位偏大
    UIStateProxy.ulTop = scrollTop - (scrollTop % (liHeight + liMarginTop))
    // 重新获取li数组起点
    var start = parseInt(scrollTop / (liHeight + liMarginTop))
    UIStateProxy.ulList = list.slice(start, start + ulLength)
})
```