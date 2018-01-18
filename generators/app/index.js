
const Generator = require('yeoman-generator')
const YamlEdit = require('yaml-edit')
const fullname = require('fullname')
var pluralize = require('pluralize')

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)

    const supportedVerbs = ['GET', 'POST', 'PUT', 'DELETE']

    // this.sourceRoot(this.destinationRoot() + '/generators/fn/templates')

    this.argument('verb', { type: String, required: true, desc: 'http verb' })
    this.argument('endpoint', { type: String, required: true, desc: 'endpoint path' })
    this.option('version', { type: Number, required: false, default: 1, desc: 'api version (defaults to 1)' })

    const verb = this.options.verb.toUpperCase()

    const endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    const fnName = endpointCase.split('/')[0]
    this.namePlural = isPlural ? fnName : pluralize.plural(fnName)
    const handler = this.options.endpoint.toLowerCase().replace(/^\/|\/$/g, '').split('.') || ''

    const version = `v${this.options.version}`

    this.tasks = []
    if (verb === 'CRUD') {
      for (let v in supportedVerbs) {
        this.tasks.push(this.createTask(v, fnName, version))
      }
    } else if (supportedVerbs.indexOf(verb) > -1) {
      this.tasks.push(this.createTask(verb, fnName, version))
    }
  }

  prompting() {

    const verb = this.options.verb.toUpperCase()
    const endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    const fnName = endpointCase.split('/')[0]
    const handler = this.options.endpoint.toLowerCase().replace(/^\/|\/$/g, '').split('.') || ''
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
      prompts.push({ message: 'Handler name', name: 'handler', type: 'input', default: handler })
      prompts.push({ message: 'Enable CORS?', name: 'cors', type: 'confirm', default: false })
    }

    return this.prompt(prompts).then((answers) => {

      this.tasks = []
      if (verb === 'CRUD') {
        if (!answers.crud) {
          return
        }
        for (let v in supportedVerbs) {
          this.tasks.push(this.createTask(v, answers.name, answers.version))
        }
      } else if (supportedVerbs.indexOf(task.verb) > -1) {
        this.tasks.push(this.createTask(task.verb, answers.name, answers.version))
      }

      fullname().then(username => {

        const today = new Date();
        const day = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

        while (this.tasks.length) {

          const task = tasks.shift()

          answers.path = answers.path || task.path

          this.fs.copyTpl(
            this.templatePath('function.ts.txt'),
            this.destinationPath(`functions/${task.version}/${task.name}/${task.handler}.ts`),
            { name: task.name, verb: task.verb, lverb: task.verb.toLowerCase(), path: answers.path, handler: answers.handler, handlerFile: task.handler, cors: answers.cors, username, day, version: task.version }
          )

          this.fs.copyTpl(
            this.templatePath('test.ts.txt'),
            this.destinationPath(`__tests__/${task.version}/${task.name}/${task.handler}.spec.ts`),
            { name: task.name, verb: task.verb, lverb: task.verb.toLowerCase(), path: answers.path, handler: answers.handler, handlerFile: task.handler, cors: answers.cors, username, day, version: task.version }
          )

          const routesText = this.fs.read('routes.yml')
          const yamlEdit = YamlEdit(routesText)
          const route = {}
          route[task.name] = {
            handler: `functions/${task.version}/${task.name}/${task.handler}.${answers.handler}`,
            events: [
              { http: { path: answers.path, method: task.verb, cors: answers.cors } },
            ]
          }
          if (this.needsId) {
            route[task.name].events[0].http.request = { parameters: { paths: { id: true } } }
          }
          yamlEdit.insertChild(task.version, route)

        }
      })
    })
  }
}

const createTask = (verb, fnName, version, handler) => {

  const isPlural = pluralize.isPlural(fnName)
  const namePlural = isPlural ? fnName : pluralize.plural(fnName)
  const nameSingular = !isPlural ? fnName : pluralize.singular(fnName)
  const needsId = verb === 'POST' ? false : !isPlural
  const handlerName = hand || verb.toLowerCase() + fnName.charAt(0).toUpperCase() + fnName.slice(1)
  const endpointPath = namePlural.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase() + (needsId ? '/{id}' : '')

  return {
    name: fnName,
    version,
    verb: verb.toUpperCase(),
    lverb: verb.toLowerCase(),
    isPlural,
    namePlural,
    nameSingular,
    needsId,
    handler: handlerName,
  }
}
