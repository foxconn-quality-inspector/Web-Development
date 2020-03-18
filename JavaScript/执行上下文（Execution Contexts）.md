# 执行上下文（Execution Contexts）

ECMA-262定义了在执行代码时会进入一个叫`执行上下文`的环境中，活动的上下文组成了一个堆栈的结构，堆栈的底层永远是全局上下文，顶部就是当前的（活动的）执行上下文。

注：标准规范没有从技术实现的角度定义执行上下文的准确类型和结构，这应该是具体实现ECMAScript引擎时要考虑的问题。

## 执行上下文栈

三种可执行代码会创建执行上下文：

1. 全局代码：js文件，script标签内的代码首次运行时进入的环境，始终处在最底层。
2. 函数代码：函数被调用时压栈，执行结束后出栈。
3. Eval代码：通过eval()执行的代码，具有与该执行环境相同的作用域，假如eval('function foo(){return 1}')在test()函数内执行则在test()函数外是访问不到的。

```javascript
let a = 'Hello World!';

function first() {
  console.log('Inside first function');
  second();
  console.log('Again inside first function');
}

function second() {
  console.log('Inside second function');
}

first();
console.log('Inside Global Execution Context');
}
```
定义`执行上下文`为EC（Execution context），`执行上下文堆栈`为ECStack

```
// 首次进入的环境
ECStack=[
  // 全局上下文
  globalContext
]
// first()
ECStack=[
  firstContext,
  globalContext
]
// second()
ECStack=[
  secondContext,
  firstContext,
  globalContext
]
// second函数执行完毕
ECStack=[
  firstContext,
  globalContext
]
// first函数执行完毕
ECStack=[
  globalContext
]
```

![](_images_/20200210002722631_1122.png =1000x)

## 执行上下文的构成

执行上下文可抽象三种属性

1. 变量对象：函数参数内部变量和函数
2. 作用域链：变量对象加上所有父级EC的变量对象，在ECStack中是处在当前EC的下方，如上图的first()和second()所示，second的EC的父级EC是first的EC。
3. this

### 创建阶段

创建上下文做了三件事情
1. 确定this的指向
2. 创建词法环境
3. 创建变量环境

#### 确定this

this的指向取决于谁调用该函数，全局上下文指向Window

```javascript
console.log(this) //指向Window
var foo = {
  bar: 'bar',
  func: function () {
  console.log(this) //指向foo
  }
}
foo.func()
```
#### 创建词法环境
从ES6之后作用域概念变为词法环境概念，变量对象和活动对象变成环境记录，对外部词法环境的引用变成作用域链

词法环境有两个部分组成：
1. 环境记录：记录变量，函数的名称和值的绑定。
2. 对外部环境的引用：使得second函数可以调用first函数内定义的函数和变量，以及全局环境里面的变量和函数。

**在创建阶段会扫描所有的变量和函数，找到函数声明会将函数名和函数引用记录；找到变量声明将变量名记录并赋给他们undefined，遇到同名变量不会进行任何操作继续扫描，变量的值只会在执行阶段确定。**

这些也是**声明提升**的原因，使得在定义函数的代码之前可以使用函数，在定义变量的代码之前使用变量（值是undefined）

```javascript
console.log(typeof foo) //function
console.log(typeof bar) // undefined
console.log(typeof a) // undefined

var a=1
var bar=2

// 在执行阶段就记录函数名和函数引用
foo() // <function> foo
function foo(){console.log('<function> foo')}

// bar是变量，他的值是函数，仍然是undefined
bar() // TypeError:bar is not a function
bar=function (){console.log('<function> bar')}

console.log(typeof bar) // function

var foo=function (){console.log('<function> bar')}

console.log(typeof foo) //function
console.log(typeof bar) // function
console.log(typeof a) // number
```

**如果在当前词法环境没有找到变量或者函数的定义，会向外部环境进行检索，一直检索到全局环境中，如果还没有检索到则报null。**


```javascript
let a = 'Hello World!';

function first() {
  console.log('<function> first')
  var b=2
  // second在first外面定义的话只能检索到a的值，因为那个时候second处在全局环境中
  function second() {
  console.log('<function> second')
  console.log(a) // Hello World!
  console.log(b) // 2
  console.log(c) // null
}
  second()
}

first()
console.log('Inside Global Execution Context')
}
```

词法环境分为两种类型
1. 全局环境（全局上下文）：没有外部环境的引用（最初进入的环境），在浏览器环境中包含一个window对象（里面包含经常使用的系统函数和对象）
2. 函数环境：函数中定义的变量被存储在环境记录中。对外部环境的引用可以是全局环境，也可以是包含内部函数的外部函数环境；处在函数环境时，环境记录会包含一个arguments对象，该对象包含形参到实参的映射以及参数长度。

JavaScript里面只有全局环境和函数环境两种并没有其他语言的块作用域，处在while，for定义的var声明的变量和函数仍然可以使用。

```javascript
var a = true
while (a) {
  a = false
  var bar1 = 1
}
for (var i = 0; i < 10; i++) {
  var bar2 = 2
}
console.log(bar1) // 1
console.log(bar2) // 2
console.log(i) // 10
```

#### 创建变量环境
变量环境也是一个词法环境，区别在于词法环境用于存储函数声明和变量（let 和 const）绑定，而变量环境仅用于存储变量（ var ）绑定，var绑定的变量会赋值undefined，let 和 const则不赋值
### 激活/代码执行阶段

所有变量和函数初始化完成，执行代码。