
const Generator = require('yeoman-generator')
const YamlEdit = require('yaml-edit')

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts)

    // this.sourceRoot(this.destinationRoot() + '/generators/fn/templates')

    this.argument('verb', { type: String, required: true, desc: 'http verb' })
    this.argument('endpoint', { type: String, required: true, desc: 'endpoint path' })

    this.endpointCase = this.options.endpoint.replace(/^\/|\/$/g, '').split('.')[0] || ''
    this.endpointHandlerArr = this.options.endpoint.toLowerCase().replace(/^\/|\/$/g, '').split('.') || ''

    this.fnname = endpointCase.split('/')[0]
    this.verb = this.options.verb
    this.handler = endpointHandlerArr[1] || this.options.verb
  }

  prompting() {
    return this.prompt([{
      message: 'Function name',
      name: 'name',
      type: 'input',
      default: this.fnname
    }, {
      message: 'HTTP verb',
      name: 'verb',
      type: 'input',
      default: this.verb.toUpperCase()
    }, {
      message: 'HTTP path',
      name: 'path',
      type: 'input',
      default: this.endpointCase.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()
    }, {
      message: 'Handler name',
      name: 'handler',
      type: 'input',
      default: this.handler
    }, {
      message: 'Enable CORS?',
      name: 'cors',
      type: 'confirm',
      default: false
    }]).then((answers) => {
      this.fs.copyTpl(
        this.templatePath('function.ts.txt'),
        this.destinationPath(`functions/${answers.name}/${answers.handler}.ts`),
        { name: answers.name, verb: answers.verb, path: answers.path, handler: answers.handler, cors: answers.cors }
      )
      this.fs.copyTpl(
        this.templatePath('test.ts.txt'),
        this.destinationPath(`__tests__/${answers.name}.${answers.handler}.spec.ts`),
        { name: answers.name, verb: answers.verb, path: answers.path, handler: answers.handler, cors: answers.cors }
      )
      const routesText = this.fs.read('routes.yml', { defaults: '' })
      const yamlEdit = YamlEdit(routesText)
      const route = {}
      route[answers.name] = {
        handler: `functions/${answers.name}/${answers.handler}.${answers.handler}`,
        events: [
          { http: { path: answers.path, method: answers.verb.toLowerCase(), cors: answers.cors } },
        ]
      }
      yamlEdit.insertChild('', route)
    })
  }
}
