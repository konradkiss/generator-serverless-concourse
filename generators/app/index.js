
const Generator = require('yeoman-generator')
const YAML = require('yamljs')
const deepmerge = require('deepmerge')
const fs = require('fs')
const fullname = require('fullname')
const pluralize = require('pluralize')

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)

    this.supportedVerbs = ['GET', 'POST', 'PUT', 'DELETE']

    this.argument('verb', { type: String, required: true, desc: 'http verb' })
    this.argument('endpoint', { type: String, required: true, desc: 'endpoint path' })
    this.option('version', { type: Number, required: false, default: 1, desc: 'api version (defaults to 1)' })

    const endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    this.endpointCaseArr = endpointCase.split('/')
    const fnName = this.endpointCaseArr[this.endpointCaseArr.length - 1]
    this.isPlural = pluralize.isPlural(fnName)
    this.needsId = this.options.verb.toUpperCase() === 'POST' ? false : !this.isPlural
    this.namePlural = this.isPlural ? fnName : pluralize.plural(fnName)
    this.nameSingular = !this.isPlural ? fnName : pluralize.singular(fnName)
    this.filePrefix = this.makeFilePath(this.endpointCaseArr.slice(0, -1)).replace(/\/\/+/g, '/')
    this.pathPrefix = this.makeUrlPath(this.endpointCaseArr.slice(0, -1)).replace(/\/\/+/g, '/')

    this.crud = this.options.verb.toUpperCase() === 'CRUD'
  }

  prompting() {

    const verb = this.options.verb.toUpperCase()
    const endpointCase = this.endpointCaseArr.join('/') || ''
    const fnName = this.endpointCaseArr[this.endpointCaseArr.length - 1]
    const handler = this.options.endpoint.toLowerCase().replace(/^\/|\/$/g, '').split('.') || ''
    let hand = fnName
    if (['PUT', 'POST', 'DELETE'].indexOf(verb.toUpperCase()) > -1) {
      hand = this.nameSingular
      this.isPlural = false
      this.needsId = this.options.verb.toUpperCase() === 'POST' ? false : true
    }
    const handlerName = verb.toLowerCase() + hand.charAt(0).toUpperCase() + hand.slice(1)
    const version = `v${this.options.version}`

    this.defaultPath = this.pathPrefix + this.namePlural + (this.needsId ? `/{${this.nameSingular}Id}` : '')

    const prompts = [];
    prompts.push({ message: 'API version?', name: 'version', type: 'input', default: version })
    prompts.push({ message: 'Function name', name: 'name', type: 'input', default: this.namePlural })
    if (this.crud) {
      prompts.push({ message: 'Enable CORS?', name: 'cors', type: 'confirm', default: false })
      prompts.push({ message: 'Generate CRUD?', name: 'crud', type: 'confirm', default: true })
    } else {
      prompts.push({ message: 'HTTP verb', name: 'verb', type: 'input', default: verb })
      prompts.push({ message: 'HTTP path', name: 'path', type: 'input', default: this.defaultPath })
      prompts.push({ message: 'Handler name', name: 'handler', type: 'input', default: handlerName })
      prompts.push({ message: 'Enable CORS?', name: 'cors', type: 'confirm', default: false })
    }

    // return this.prompt(prompts).then(() => { })

    return this.prompt(prompts).then((answers) => {

      this.tasks = []

      this.endpointCaseArr = this.cmdFromPath(answers.path || this.defaultPath).split('/').filter(Boolean)
      this.prefixParams = this.getPrefixParams(answers.path || this.defaultPath)
      this.filePrefix = this.makeFilePath(this.endpointCaseArr.slice(0, -1)).replace(/\/\/+/g, '/')
      this.pathPrefix = this.makeUrlPath(this.endpointCaseArr.slice(0, -1)).replace(/\/\/+/g, '/')

      if (this.crud) {
        if (!answers.crud) {
          return
        }

        const sName = pluralize.isPlural(answers.name) ? pluralize.singular(answers.name) : answers.name
        const pName = pluralize.isPlural(answers.name) ? answers.name : pluralize.plural(answers.name)

        this.tasks.push(this.createTask('GET', pName, answers.version))
        this.tasks.push(this.createTask('GET', sName, answers.version))
        this.tasks.push(this.createTask('POST', sName, answers.version))
        this.tasks.push(this.createTask('PUT', sName, answers.version))
        this.tasks.push(this.createTask('DELETE', sName, answers.version))

      } else if (this.supportedVerbs.indexOf(answers.verb) > -1) {
        this.tasks.push(this.createTask(answers.verb, answers.name, answers.version))
      }

      fullname().then(username => {

        const today = new Date();
        const day = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

        const routes = {}

        for (const t in this.tasks) {
          const task = this.tasks[t]

          answers.path = answers.path || task.path
          answers.handler = answers.handler || (task.verb.toLowerCase() + task.name.charAt(0).toUpperCase() + task.name.slice(1))
          this.tasks[t].path = answers.path
          this.tasks[t].handler = answers.handler

          const depthPrefix = '../'.repeat(Math.max(0, (this.filePrefix.match(new RegExp("/", "g")) || []).length))

          this.fs.copyTpl(
            this.templatePath('function.ts.txt'),
            this.destinationPath(`functions/${task.version}/${this.filePrefix}${task.namePlural}/${answers.handler}.ts`),
            { name: task.name, nameSingular: task.nameSingular, namePlural: task.namePlural, verb: task.verb, lverb: task.verb.toLowerCase(), depthPrefix: depthPrefix, filePrefix: this.filePrefix, pathPrefix: this.pathPrefix, path: answers.path, handler: answers.handler, handlerFile: answers.handler, cors: answers.cors, username, day, version: task.version }
          )

          this.fs.copyTpl(
            this.templatePath('test.ts.txt'),
            this.destinationPath(`__tests__/${task.version}/${this.filePrefix}${task.namePlural}/${answers.handler}.ts`),
            { name: task.name, nameSingular: task.nameSingular, namePlural: task.namePlural, verb: task.verb, lverb: task.verb.toLowerCase(), depthPrefix: depthPrefix, filePrefix: this.filePrefix, pathPrefix: this.pathPrefix, path: answers.path, handler: answers.handler, handlerFile: answers.handler, cors: answers.cors, username, day, version: task.version }
          )

          const routeReference = `${task.version}_${task.namePlural}_${answers.handler}`
          routes[routeReference] = {
            handler: `functions/${task.version}/${this.filePrefix}${task.namePlural}/${answers.handler}.${answers.handler}`,
            events: [
              { http: { method: task.verb, path: `${this.pathPrefix}${answers.path}` } },
            ]
          }
          if (answers.cors) {
            routes[routeReference].events[0].http.cors = true
          }

          const pathParams = this.prefixParams.slice()

          if (task.needsId) {
            pathParams.push(`${task.nameSingular}Id`)
          }
          if (Object.keys(pathParams).length > 0) {
            const pathParameters = {}
            for (let p in pathParams) {
              pathParameters[pathParams[p]] = true
            }
            routes[routeReference].events[0].http.request = { parameters: { paths: pathParameters } }
          }

          answers.path = null
          answers.handler = null
        }

        YAML.load('routes.yml', (obj) => {
          for (const task of this.tasks) {
            if (obj !== null && obj[`${task.version}_${task.namePlural}_${task.handler}`]) {
              delete obj[`${task.version}_${task.namePlural}_${task.handler}`]
            }
          }
          fs.writeFile('routes.yml', YAML.stringify(Object.assign({}, obj, routes), 2))
        })
      })
    })
  }

  cmdFromPath(qPath) {
    let res = ''
    let segmentBuffer = ''
    qPath = qPath.split('/')

    for (let segment of qPath) {
      if (segment[0] === '{' && segment[segment.length - 1] === '}') {
        res += (pluralize.isPlural(segmentBuffer) ? pluralize.singular(segmentBuffer) : segmentBuffer) + '/'
        segmentBuffer = ''
      } else {
        if (segmentBuffer !== '') {
          res += segmentBuffer + '/'
        }
        segmentBuffer = segment
      }
    }

    res += (res + segmentBuffer).trim() === '' ? '' : (segmentBuffer + '/')
    return res.trim()
  }

  getPrefixParams(qPath) {
    const res = []
    qPath = qPath.split('/')
    for (let segment of qPath) {
      if (segment[0] === '{' && segment[segment.length - 1] === '}') {
        res.push(segment.replace(/(^\{|\}$)/g, ''))
      }
    }
    return res
  }

  makeFilePath(arr) {
    let res = ''
    for (let segment of arr) {
      res += (pluralize.isPlural(segment) ? `${segment}` : pluralize.plural(segment)) + '/'
    }
    return res
  }

  makeUrlPath(arr) {
    let res = ''
    for (let segment of arr) {
      res += (pluralize.isPlural(segment) ? `${segment}` : (pluralize.plural(segment) + `/{${segment}Id}`)) + '/'
    }
    return res
  }

  createTask(verb, fnName, version) {
    let isPlural = pluralize.isPlural(fnName)
    const namePlural = isPlural ? fnName : pluralize.plural(fnName)
    const nameSingular = !isPlural ? fnName : pluralize.singular(fnName)
    let hand = fnName
    if (['PUT', 'POST', 'DELETE'].indexOf(verb.toUpperCase()) > -1) {
      hand = nameSingular
      isPlural = false
    }
    const needsId = verb.toUpperCase() === 'POST' ? false : !isPlural
    const handlerName = verb.toLowerCase() + hand.charAt(0).toUpperCase() + hand.slice(1)
    const endpointPath = namePlural.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase() + (needsId ? `/{${nameSingular}Id}` : '')

    return {
      name: fnName,
      version,
      verb: verb.toUpperCase(),
      lverb: verb.toLowerCase(),
      namePlural,
      nameSingular,
      isPlural,
      needsId,
      handler: handlerName,
      path: endpointPath
    }
  }
}
