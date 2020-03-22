# 防抖（debounce）和节流（throttle）
## 防抖
防抖是指事件或者函数在频繁触发的情况下不触发，当暂停触发一段时间后只执行最后一次，作用是摒除“噪声”。

![未处理的图片](_images_/20200321163747933_2092.gif =500x)

上面一个例子中，红色的方块绑定了mousemove事件只要鼠标在上面移动就会使数字增加，假如我们只想拿到鼠标移动的次数而不是事件触发次数，就需要使用防抖。
防抖的原理就是使用定时器，当第一次触发时候定时器时创建一个定时器执行回调函数，并使用闭包保存改定时器种子，下次触发时判断定时器种子是否存在，存在则重新创建一个定时器，清除掉之前的定时器。

```javascript
// 回调函数，间隔，是否执行第一次回调函数
function debounce(fn, wait = 200, immediate = true) {
    // 利用闭包保存定时器种子
    let timer = null

    return function () {
        // time为空清除定时器种子，但是time还是有值
        if (timer) clearTimeout(timer)
        // 执行第一次回调函数，第一次执行时time为null
        // 为了避免handle不能获取到MouseEvent鼠标事件需要重定向this
        if (immediate && !timer) fn.apply(this, arguments)
        timer = setTimeout(() => {
            fn.apply(this, arguments)
        }, wait)
    }
}
// 示例
box.addEventListener('mousemove', debounce(handle, 300, true))
```

![防抖处理后效果图](_images_/20200321230238039_31456.gif =600x)

具体差异见下图

![普通调用和防抖处理过的比对](_images_/20200321230840591_26242.gif =900x)

防抖广泛用于resize，scroll，mousemove等频繁触发的事件中。

## 节流

节流是在事件或者函数在频繁触发的情况下，一段时间内只执行一次，节流是防止函数触发频率高于响应速度。

![节流处理过的效果](_images_/20200322133219491_11116.gif =600x)

可以从上图上看到节流处理过后，事件触发的不那么频繁了，但是仍然在触发。

节流的实现有两种，第一种是通过计算前后两次函数触发的间隔和设定的时间差比较，如果大于时间差则执行回调，小于则不执行；第二种实现是通过定时器的方法，定时器不为空的时候不执行回调函数，当定时器种子为空时定时执行回调函数并在回调函数里面讲定时器清空。

时间差实现：

```javascript
function throttle(fn, wait = 200) {
    // 上一次函数触发时间
    let prev = 0
    return function () {
        // 当前时间
        let now = new Date()
        // 大于时间差执行
        if (now - prev > wait) {
            fn.apply(this, arguments);
            prev = now
        }
    }
}
```

定时器实现：

```javascript
function throttle(fn, wait = 200) {
    let time = null
    return function () {
        // 不存在定时器种子说明setTimeout执行了
        if (!time) {
            time = setTimeout(() => {
                fn.apply(this, arguments)
                clearTimeout(time)
                time = null
            }, wait);
        }
    }
}
```

## 总结

防抖和节流都是限制函数频繁触发，在频繁触发函数中，假如是函数是由一段有目的的操作产生的，则时候使用防抖（如监听window.scroll）；假如函数是由相同类型操作频繁触发的（如输入框联想词）需要稀释触发频率则使用节流，这样能避免响应速度（向服务器查询关键词）更不上触发速度导致卡顿等。

防抖和节流的可视化图如下：

![节流和防抖的对比图](_images_/20200322161328728_6973.gif =1000x)
