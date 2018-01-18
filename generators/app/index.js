
const Generator = require('yeoman-generator')
const YamlEdit = require('yaml-edit')
const fullname = require('fullname')
var pluralize = require('pluralize')

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)

    // this.sourceRoot(this.destinationRoot() + '/generators/fn/templates')

    this.argument('verb', { type: String, required: true, desc: 'http verb' })
    this.argument('endpoint', { type: String, required: true, desc: 'endpoint path' })
    this.option('version', { type: Number, required: false, default: 1, desc: 'api version (defaults to 1)' })

    this.version = `v${this.options.version}`

    this.endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    this.endpointHandlerArr = this.options.endpoint.toLowerCase().replace(/^\/|\/$/g, '').split('.') || ''

    this.fnname = this.endpointCase.split('/')[0]
    this.namePlural = pluralize.isPlural(this.fnname) ? this.fnname : pluralize.plural(this.fnname)
    this.nameSingular = pluralize.isSingular(this.fnname) ? this.fnname : pluralize.singular(this.fnname)

    this.verb = this.options.verb.toUpperCase()
    this.handler = this.endpointHandlerArr[1] || this.options.verb.toLowerCase() + this.fnname.charAt(0).toUpperCase() + this.fnname.slice(1)
  }

  prompting() {

    const prompts = [
      { message: 'API version?',  name: 'version',  type: 'input',  default: this.version },
      { message: 'Function name', name: 'name',     type: 'input',  default: this.namePlural },
      { message: 'HTTP verb',     name: 'verb',     type: 'input',  default: this.verb },
      { message: 'HTTP path',     name: 'path',     type: 'input',  default: this.namePlural.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase() },
      { message: 'Handler name',  name: 'handler',  type: 'input',  default: this.handler },
      { message: 'Enable CORS?',  name: 'cors',   type: 'confirm',  default: false },
    ]

    return this.prompt(prompts).then((answers) => {
      fullname().then(username => {
        const today = new Date();
        const day = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`

        this.handlerFile = answers.handler.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()

        this.fs.copyTpl(
          this.templatePath('function.ts.txt'),
          this.destinationPath(`functions/${answers.version}/${answers.name}/${this.handlerFile}.ts`),
          { name: answers.name, verb: answers.verb, lverb: answers.verb.toLowerCase(), path: answers.path, handler: answers.handler, cors: answers.cors, username, day, version: answers.version }
        )

        this.fs.copyTpl(
          this.templatePath('test.ts.txt'),
          this.destinationPath(`__tests__/${answers.version}/${answers.name}/${this.handlerFile}.spec.ts`),
          { name: answers.name, verb: answers.verb, lverb: answers.verb.toLowerCase(), path: answers.path, handler: answers.handler, cors: answers.cors, username, day, version: answers.version }
        )

        const routesText = this.fs.read('routes.yml')
        const yamlEdit = YamlEdit(routesText)
        const route = {}
        route[answers.name] = {
          handler: `functions/${answers.version}/${answers.name}/${answers.verb.toLowerCase()}.${answers.handler}`,
          events: [
            { http: { path: answers.path, method: answers.verb, cors: answers.cors } },
          ]
        }
        yamlEdit.insertChild(answers.version, route)
      })
    })
  }
}
