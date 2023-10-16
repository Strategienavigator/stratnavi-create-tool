#! /usr/bin/env node
'use strict';

const chalk = require("chalk");
const version = require("./package.json");
const {ArgumentParser} = require("argparse");
const {input, confirm} = require("@inquirer/prompts");
const fs = require("fs");
const {path} = require("os");

String.prototype.toPascalCase = function() {
    return this
        .toLowerCase()
        .replace(new RegExp(/[-_]+/, 'g'), ' ')
        .replace(new RegExp(/[^\w\s]/, 'g'), '')
        .replace(
            new RegExp(/\s+(.)(\w*)/, 'g'),
            ($1, $2, $3) => `${$2.toUpperCase() + $3}`
        )
        .replace(new RegExp(/\w/), s => s.toUpperCase());
};

const REPLACES = {
    name: "<GQGAKTYFMU>",
    nameCC: "<EPHAFPJMNO>",
    displayName: "<GTIITEGVHM>",
    stepsType: "<EEAJOESUNA>",
    stepsObject: "<DYOZJAQJZS>",
    stepsCode: "<HMZOHQRXPU>",
    stepsImports: "<CYGNPBTJHG>",
    stepName: "<KDEPRPMGKG>",
    stepID: "<GGHPKHMEQV>",
    stepIDLowerCase: "<ONQIWPWAZK>",
    stepDisplayName: "<CLAYJUMPJR>",
    maintenance: "<YDLXOYVBGG>",
    subStepImports: "<CJGTJNYRQY>",
    subStepExtend: "<DOUFGUACEX>",
    subStepCode: "<XNZTLZNVWG>",
    subStepConstructor: "<JFOAACOIED>",
    substepExtraClass: "<LHDXTCHDDA>",
    extraWindowImport: "<SRXXEQMYCJ>",
    extraWindowConstructor: "<KHAQMATZEZ>",
    extraWindowID: "<TCLTINWSSI>",
    JSONImporterImport: "<VVWYXXOWYW>",
    ExcelExportSnippet: "<BJQQEFIPWA>",
    ExcelExportFunction: "<IWDJGMFWRS>",
    ExcelExportImports: "<IWHMAOLWRS>",
    ExcelExportAdd: "<UCOLCBBPMD>",
    ExcelExportImport: "<XZLXUFLQAW>"
};

const parser = new ArgumentParser({
    description: "Ermöglicht es im Strategienavigator ein Tool mithilfe der Kommandozeile zu erstellen.",
    epilog: "Example: create-tool swot-analysis SWOT-Analyse -m"
});

parser.add_argument('name', { metavar: "name", type: "str", help: "Der Name des Tools"});
parser.add_argument('displayName', { metavar: "dName", type: "str", help: "Der Anzeigename des Tools"});
parser.add_argument('-m', { action: 'store_true', help: "Wartungsmodus anschalten" });
parser.add_argument('-v', '--version', { action: 'version', version });

parser.add_argument('-p', '--path', { action: 'store', type: function dir_path(value) {
        try {
            fs.lstatSync(value).isDirectory();
        } catch (ex) {
            throw TypeError("Couldn't find given Directory!");
        }
        return value;
    }, help: "Ablegepfad (Ordner)"});

const replaceAll = (data, args, stepStrings) => {
    let argsCC = args.name.toPascalCase();

    // Replace
    data = data.replaceAll(REPLACES.displayName, args.displayName);
    data = data.replaceAll(REPLACES.nameCC, argsCC);
    data = data.replaceAll(REPLACES.name, args.name);
    data = data.replaceAll(REPLACES.maintenance, args.m.toString());

    // Steps
    data = data.replaceAll(REPLACES.stepsCode, stepStrings.stepsCode);
    data = data.replaceAll(REPLACES.stepsObject, stepStrings.stepsObject);
    data = data.replaceAll(REPLACES.stepsType, stepStrings.stepsType);
    data = data.replaceAll(REPLACES.stepsImports, stepStrings.stepsImports);

    return data;
}

const replaceStepValues = (data, step) => {
    data = data.replaceAll(REPLACES.stepID, step.id);
    data = data.replaceAll(REPLACES.stepIDLowerCase, step.id.replaceAll("-", "").replaceAll(".", "").toLowerCase());
    data = data.replaceAll(REPLACES.stepName, step.idPascal);
    data = data.replaceAll(REPLACES.stepDisplayName, step.displayName);
    return data;
}

// Start
const args = parser.parse_args();

// Schritte abfragen
const getInputs = async () => {
    let wantsToAddStep = true;
    let i = 1;
    let inputs = {
        steps: Array(),
        useExcelExport: false
    };

    while (wantsToAddStep) {
        wantsToAddStep = await confirm({message: `Möchten Sie einen ${i !== 1 ? "weiteren " : ""}Schritt hinzufügen?`, default: false});

        if (wantsToAddStep) {
            console.log(chalk.inverse("-----", chalk.bold(`  Schritt ${i}  `), "-----"));
            let ID = await input({message: "System-ID festlegen (z.B. swot-criterias):"});
            let name = await input({message: `Namen des Schrittes (ohne ${i}.): `});

            let extraWindowDisplayName = "";
            let hasExtraWindow = await confirm({message: "Wollen Sie ein Extrawindow einbauen?", default: false});
            if (hasExtraWindow) {
                extraWindowDisplayName = await input({message: "Dann legen Sie einen Anzeigenamen für dieses fest:"});
            }

            inputs.steps[i - 1] = {
                id: ID,
                hasSubsteps: await confirm({message: "Besitzt dieser Schritt unterschritte?", default: false}),
                extraWindow: hasExtraWindow ? {
                    displayName: extraWindowDisplayName
                } : null,
                idPascal: ID.toPascalCase(),
                name: name,
                displayName: `${i}. ${name}`
            };
            i += 1;
            console.log(" ");
        }
    }
    inputs.useExcelExport = await confirm({message: `Möchten Sie einen Excel-Export hinzufügen?`, default: false});
    return inputs;
}

getInputs().then(inputs => {
    let pascalName = args.name.toPascalCase();
    let folder = `${args.path ?? process.cwd()}/${args.name}`;
    let stepsFolder = `${folder}/steps`;
    let templateFolder = `${__dirname}/template`;

    // Hauptordner
    fs.mkdir(folder, { recursive: true }, (err) => {
        if (err == null) {
            // Ordner
            fs.mkdir(`${folder}/extraWindow`, { recursive: true }, () => {});
            fs.mkdir(`${folder}/import`, { recursive: true }, () => {});
            fs.mkdir(`${folder}/export`, { recursive: true }, () => {});
            fs.mkdir(stepsFolder, { recursive: true }, () => {});

            // Wandle Steps in strings um
            let stepStrings = {
                stepsType: inputs.steps.map(i => `"${i.id}"?: ${i.idPascal}Values`).join(",\n\t"),
                stepsObject: inputs.steps.map(i => `"${i.id}": undefined`).join(",\n\t\t\t"),
                stepsCode: inputs.steps.map(i => `this.addStep(new ${i.idPascal}());`).join("\n\t\t"),
                stepsImports: inputs.steps.map(i => {
                    let s = `import {${i.idPascal}} from "./steps/${i.idPascal}/${i.idPascal}";`;
                    s += "\n";
                    s += `import {${i.idPascal}Values} from "./steps/${i.idPascal}/${i.idPascal}Component";`;
                    return s;
                }).join("\n"),
                stepsSCSS: inputs.steps.map(i => `#${i.id} {\n\t\n}`).join("\n\n")
            };

            // SCSS file
            fs.writeFile(`${folder}/${args.name}.scss`, stepStrings.stepsSCSS, () => {});

            // Tool-file
            fs.readFile(`${templateFolder}/template.txt`, 'utf8', (err, data) => {
                if (err) {
                    return;
                }
                data = replaceAll(data, args, stepStrings);
                data = data.replaceAll(REPLACES.JSONImporterImport, `\nimport {${pascalName}JSONImporter} from "./import/${pascalName}JSONImporter";`);

                let add = "";
                let excelImport = "";
                if (inputs.useExcelExport) {
                    add = `\n\t\tthis.addExporter(new ${pascalName}ExcelExporter());`;
                    excelImport = `\nimport {${pascalName}ExcelExporter} from "./export/${pascalName}ExcelExporter";`;
                }
                data = data.replaceAll(REPLACES.ExcelExportAdd, add);
                data = data.replaceAll(REPLACES.ExcelExportImport, excelImport);

                fs.writeFile(`${folder}/${pascalName}.tsx`, data, 'utf8', (err) => {
                    if (err) {
                        return;
                    }

                    // Hole SubStepcode
                    let subStepCode = "";
                    if (inputs.steps.some(i => i.hasSubsteps)) {
                        fs.readFile(`${templateFolder}/templateSubstepCode.txt`, 'utf8', (err, data) => {
                            if (err) {
                                return;
                            }
                            subStepCode = replaceAll(data, args, stepStrings);
                        });
                    }

                    // Hole ExtraWindowCode
                    let extraWindowCode = "";
                    if (inputs.steps.some(i => i.extraWindow !== null)) {
                        fs.readFile(`${templateFolder}/templateExtraWindow.txt`, 'utf8', (err, data) => {
                            if (err) {
                                return;
                            }
                            extraWindowCode = data;
                        });
                    }

                    // Schreibe Step dateien
                    for (const step of inputs.steps) {
                        let stepFolder = `${stepsFolder}/${step.idPascal}`;
                        fs.mkdir(stepFolder, { recursive: true }, (err) => {
                            if (err) {
                                return;
                            }

                            // Component
                            fs.readFile(`${templateFolder}/templateStepComponent.txt`, 'utf8', (err, data) => {
                                if (err) {
                                    return;
                                }
                                data = replaceAll(data, args, stepStrings);
                                data = replaceStepValues(data, step);

                                fs.writeFile(`${stepFolder}/${step.idPascal}Component.tsx`, data, 'utf8', (err) => {});
                            });

                            // Step-file
                            fs.readFile(`${templateFolder}/templateStep.txt`, 'utf8', (err, data) => {
                                if (err) {
                                    return;
                                }
                                data = replaceAll(data, args, stepStrings);
                                data = replaceStepValues(data, step);

                                // Strings
                                let importsString = "";
                                let subStepConstructor = "";
                                let subStepExtends = "";
                                let subExtraClass = "";
                                let extraWindowImport = "";
                                let extraWindowConstructor = "";
                                let newSubStepCode = "";

                                // Extrawindow prüfen
                                if (step.extraWindow !== null) {
                                    importsString += ",\n\tExtraWindowDefinition";
                                    extraWindowImport = `\nimport {${step.idPascal}ExtraWindow} from "../../extraWindow/${step.idPascal}ExtraWindow";`;
                                    subExtraClass = `\n\textraWindow: ExtraWindowDefinition<${pascalName}Values>;`;

                                    extraWindowConstructor = "this.extraWindow = {\n\t\t\t";
                                    extraWindowConstructor += `displayName: "${step.extraWindow.displayName}",\n\t\t\t`;
                                    extraWindowConstructor += `extraWindowComponent: ${step.idPascal}ExtraWindow,\n\t\t`;
                                    extraWindowConstructor += "};";

                                    // Erstelle ExtraWindow
                                    let newExtraWindowCode;
                                    newExtraWindowCode = extraWindowCode;
                                    newExtraWindowCode = replaceAll(newExtraWindowCode, args, stepStrings);
                                    newExtraWindowCode = replaceStepValues(newExtraWindowCode, step);
                                    newExtraWindowCode = newExtraWindowCode.replaceAll(REPLACES.extraWindowID, `${step.id}-extra-window`);

                                    fs.writeFile(`${folder}/extraWindow/${step.idPascal}ExtraWindow.tsx`, newExtraWindowCode, 'utf8', (err) => {});
                                    fs.open(`${folder}/extraWindow/${step.id}-extra-window.scss`, "w", () => {});
                                }

                                // Substep
                                if (step.hasSubsteps) {
                                    importsString += ",\n\tSubStepDefinition";
                                    subStepExtends = `, SubStepDefinition<${pascalName}Values>`;
                                    subExtraClass += `\n\tsubStep: SubStepDefinition<${pascalName}Values>;`;
                                    newSubStepCode = subStepCode;

                                    if (extraWindowConstructor !== "") {
                                        subStepConstructor += "\n\t\t";
                                    }
                                    subStepConstructor += "this.subStep = this;";
                                }

                                // Replaces
                                data = data.replaceAll(REPLACES.extraWindowImport, extraWindowImport);
                                data = data.replaceAll(REPLACES.extraWindowConstructor, extraWindowConstructor);
                                data = data.replaceAll(REPLACES.subStepConstructor, subStepConstructor);
                                data = data.replaceAll(REPLACES.substepExtraClass, subExtraClass);
                                data = data.replaceAll(REPLACES.subStepExtend, subStepExtends);
                                data = data.replaceAll(REPLACES.subStepImports, importsString);
                                data = data.replaceAll(REPLACES.subStepCode, newSubStepCode);

                                fs.writeFile(`${stepFolder}/${step.idPascal}.ts`, data, 'utf8', (err) => {});
                            });
                        });
                    }

                    // Importer
                    fs.readFile(`${templateFolder}/templateImport.txt`, 'utf8', (err, data) => {
                        if (err) {
                            return;
                        }
                        data = replaceAll(data, args, stepStrings);
                        fs.writeFile(`${folder}/import/${pascalName}JSONImporter.ts`, data, 'utf8', (err) => {});
                    });

                    if (inputs.useExcelExport) {
                        // Excel-Exporter
                        fs.readFile(`${templateFolder}/templateExcelExport.txt`, 'utf8', (err, data) => {
                            if (err) {
                                return;
                            }

                            // read snippets & methods
                            let methodCode = "";
                            let snippetCode = "";

                            fs.readFile(`${templateFolder}/excelExportFunction.txt`, 'utf8', (err, data2) => {
                               methodCode = data2;

                                fs.readFile(`${templateFolder}/excelExportCodeSnippet.txt`, 'utf8', (err, data3) => {
                                    snippetCode = data3;
                                    data = replaceAll(data, args, stepStrings);

                                    let methods = "";
                                    let snippets = "";
                                    let imports = "";

                                    for (const step of inputs.steps) {
                                        // snippets
                                        let newSnippetCode;
                                        newSnippetCode = snippetCode;
                                        newSnippetCode = replaceAll(newSnippetCode, args, stepStrings);
                                        newSnippetCode = replaceStepValues(newSnippetCode, step);
                                        snippets += `${newSnippetCode}\n\n`;

                                        // methods
                                        let newMethodCode;
                                        newMethodCode = methodCode;
                                        newMethodCode = replaceAll(newMethodCode, args, stepStrings);
                                        newMethodCode = replaceStepValues(newMethodCode, step);
                                        methods += `${newMethodCode}\n\n`;

                                        // imports
                                        imports += `import {${step.idPascal}Values} from "../steps/${step.idPascal}/${step.idPascal}Component";\n`;
                                    }
                                    data = data.replaceAll(REPLACES.ExcelExportSnippet, snippets);
                                    data = data.replaceAll(REPLACES.ExcelExportFunction, methods);
                                    data = data.replaceAll(REPLACES.ExcelExportImports, imports);

                                    fs.writeFile(`${folder}/export/${pascalName}ExcelExporter.ts`, data, 'utf8', (err) => {});
                                });
                            });
                        });
                    }

                    console.log("");
                    console.log(chalk.bold(`Tool "${chalk.inverse(pascalName)}" erfolgreich erstellt!`));
                    console.log("Das neue tool befindet sich nun im Ordner: " + chalk.bold(folder));
                });
            });
        }
    });
});
