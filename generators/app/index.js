
const Generator = require('yeoman-generator')
const YAML = require('yamljs')
const fs = require('fs')
const fullname = require('fullname')
const pluralize = require('pluralize')

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)

    this.supportedVerbs = ['GET', 'POST', 'PUT', 'DELETE']

    // this.sourceRoot(this.destinationRoot() + '/generators/fn/templates')

    this.argument('verb', { type: String, required: true, desc: 'http verb' })
    this.argument('endpoint', { type: String, required: true, desc: 'endpoint path' })
    this.option('version', { type: Number, required: false, default: 1, desc: 'api version (defaults to 1)' })

    const endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    const fnName = endpointCase.split('/')[0]
    this.isPlural = pluralize.isPlural(fnName)
    this.needsId = this.options.verb.toUpperCase() === 'POST' ? false : !this.isPlural
    this.namePlural = this.isPlural ? fnName : pluralize.plural(fnName)
    this.nameSingular = !this.isPlural ? fnName : pluralize.singular(fnName)

    this.crud = this.options.verb.toUpperCase() === 'CRUD'
  }

  prompting() {

    const verb = this.options.verb.toUpperCase()
    const endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    const fnName = endpointCase.split('/')[0]
    const handler = this.options.endpoint.toLowerCase().replace(/^\/|\/$/g, '').split('.') || ''
    let hand = fnName
    if (['PUT', 'POST', 'DELETE'].indexOf(verb.toUpperCase()) > -1) {
      hand = this.nameSingular
      this.isPlural = false
      this.needsId = this.options.verb.toUpperCase() === 'POST' ? false : true
    }
    const handlerName = verb.toLowerCase() + hand.charAt(0).toUpperCase() + hand.slice(1)
    const version = `v${this.options.version}`

    this.defaultPath = this.namePlural.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase() + (this.needsId ? '/{id}' : '')

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

    return this.prompt(prompts).then((answers) => {

      this.tasks = []

      if (this.crud) {

        if (!answers.crud) {
          return
        }

        const sName = pluralize.isPlural(answers.name) ? pluralize.singular(answers.name) : answers.name
        const pName = pluralize.isPlural(answers.name) ? answers.name : pluralize.plural(answers.name)

        this.tasks.push(createTask('GET', pName, answers.version))
        this.tasks.push(createTask('GET', sName, answers.version))
        this.tasks.push(createTask('POST', sName, answers.version))
        this.tasks.push(createTask('PUT', sName, answers.version))
        this.tasks.push(createTask('DELETE', sName, answers.version))

      } else if (this.supportedVerbs.indexOf(answers.verb) > -1) {

        this.tasks.push(createTask(answers.verb, answers.name, answers.version))

      }

      fullname().then(username => {

        const today = new Date();
        const day = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

        const routes = {}
        routes[answers.version] = {}

        for (const task of this.tasks) {

          answers.path = answers.path || task.path
          answers.handler = answers.handler || task.verb.toLowerCase() + task.name.charAt(0).toUpperCase() + task.name.slice(1)

          this.fs.copyTpl(
            this.templatePath('function.ts.txt'),
            this.destinationPath(`functions/${task.version}/${task.namePlural}/${answers.handler}.ts`),
            { name: task.name, nameSingular: task.nameSingular, namePlural: task.namePlural, verb: task.verb, lverb: task.verb.toLowerCase(), path: answers.path, handler: answers.handler, handlerFile: answers.handler, cors: answers.cors, username, day, version: task.version }
          )

          this.fs.copyTpl(
            this.templatePath('test.ts.txt'),
            this.destinationPath(`__tests__/${task.version}/${task.namePlural}/${answers.handler}.spec.ts`),
            { name: task.name, nameSingular: task.nameSingular, namePlural: task.namePlural, verb: task.verb, lverb: task.verb.toLowerCase(), path: answers.path, handler: answers.handler, handlerFile: answers.handler, cors: answers.cors, username, day, version: task.version }
          )

          const routeReference = `${task.namePlural}_${answers.handler}`
          routes[answers.version][routeReference] = {
            handler: `functions/${task.version}/${task.name}/${answers.handler}.${answers.handler}`,
            events: [
              { http: { method: task.verb, path: answers.path } },
            ]
          }
          if (answers.cors) {
            routes[answers.version][routeReference].events[0].http.cors = true
          }
          if (task.needsId) {
            routes[answers.version][routeReference].events[0].http.request = { parameters: { paths: { id: true } } }
          }

          answers.path = null
          answers.handler = null
        }

        YAML.load('routes.yml', (obj) => {
          const newRoutes = Object.assign({}, obj, routes)
          fs.writeFile('routes.yml', YAML.stringify(newRoutes, 3))
        })
      })
    })
  }
}

const createTask = (verb, fnName, version, handler) => {

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
  const endpointPath = namePlural.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase() + (needsId ? '/{id}' : '')

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
