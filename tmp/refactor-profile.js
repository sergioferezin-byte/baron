import fs from 'fs';

const filePath = 'src/components/UserProfilePanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Identify start of the giant motion.div inside activeStep
// Lines around 631:
//             <AnimatePresence mode="wait">
//               <motion.div
//                 key={activeStep}
//                 initial={{ opacity: 0, scale: 0.98, y: 10 }}
const startAnchor = '            <AnimatePresence mode="wait">\n              <motion.div\n                key={activeStep}';

const startOffset = content.indexOf(startAnchor);
if (startOffset === -1) {
  console.error("Could not find start anchor");
  process.exit(1);
}

// Find the corresponding end of that <AnimatePresence mode="wait">...</AnimatePresence> block plus the bottom nav button panel.
// The block ends around right before:
//           </div>
//         </div>
//       </div>
//       {/* Advanced Control Drawer: System Prompt Weight Adjustments */}
const endAnchor = '            {/* Bottom Button Panel */}\n            <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6 z-10">';
const endOffset = content.indexOf(endAnchor);
if (endOffset === -1) {
  console.error("Could not find end anchor");
  process.exit(1);
}

// Let's find where the outer grid container column finishes.
// In our file:
//               </div>
//             </div>
// 
//           </div>
//         </div>
// 
//       </div>
// 
//       {/* Advanced Control Drawer: System Prompt Weight Adjustments */}
const outerCloseAnchor = '          </div>\n        </div>\n\n      </div>\n\n      {/* Advanced Control Drawer: System Prompt Weight Adjustments */}';
const outerCloseOffset = content.indexOf(outerCloseAnchor);
if (outerCloseOffset === -1) {
  console.error("Could not find outer close anchor");
  process.exit(1);
}

// Now we want to extract the entire step rendering body from <motion.div> to the end of the Bottom Button Panel.
// The motion.div starts right after `<AnimatePresence mode="wait">\n`.
const motionDivRealStart = content.indexOf('<motion.div', startOffset);
// The ending tag of the Bottom Button Panel (which we viewed at line 2343):
//             </div>
//           </div>
// 
//         </div>
//       </div>
// We know that the whole block of the right-column content begins at the `<motion.div...>` line
// and ends after the bottom button panel.
// Let's locate the bottom button panel closing:
//               </div>
//             </div>
// Since it's inside the AnimatePresence / Right column bg, let's look for:
const bottomPanelEndAnchor = '            </div>\n\n          </div>\n        </div>';
const bottomPanelEndOffset = content.indexOf(bottomPanelEndAnchor, endOffset);
if (bottomPanelEndOffset === -1) {
  console.error("Could not find bottom panel end anchor");
  process.exit(1);
}

// The exact block of JSX start and end
const jsxBlockStart = motionDivRealStart;
// We also want to include the bottom button panel inside the motion.div wrapper so it animates together!
// Line 2302:               </motion.div>
// Let's find where that is.
const motionDivRealEndTag = '              </motion.div>';
const motionDivRealEndIndex = content.indexOf(motionDivRealEndTag, endOffset);
if (motionDivRealEndIndex === -1) {
  console.error("Could not find motion.div real end tag");
  process.exit(1);
}

// Wait! If we put the Bottom Button Panel INSIDE our renderStepContent function,
// then renderStepContent can render the header, the form, and the bottom button panel together!
// Let's see: the bottom button panel ends right after line 2343:
//               </div>
//             </div>
// Let's find:
const rightColumnBgEndIndex = content.indexOf('          </div>\n        </div>', endOffset);

// So from motionDivRealStart to rightColumnBgEndIndex is our entire active step viewport content!
// Let's extract that block of code!
let extractedJsx = content.substring(motionDivRealStart, rightColumnBgEndIndex);

// Let's replace 'activeStep' with 'stepIndex' inside the extracted JSX, except for references updating state
// where we still want state changes like 'setActiveStep' but we can use helper function params.
// Let's write replacements for the activeStep checks.
extractedJsx = extractedJsx.replace(/key=\{activeStep\}/g, 'key={stepIndex}');
extractedJsx = extractedJsx.replace(/\{activeStep \+ 1\}/g, '{stepIndex + 1}');
extractedJsx = extractedJsx.replace(/steps\[activeStep\]/g, 'steps[stepIndex]');
extractedJsx = extractedJsx.replace(/activeStep === (\d)/g, 'stepIndex === $1');
extractedJsx = extractedJsx.replace(/disabled=\{activeStep === 0\}/g, 'disabled={stepIndex === 0}');
extractedJsx = extractedJsx.replace(/activeStep < steps.length - 1/g, 'stepIndex < steps.length - 1');

// Let's adjust the Anterior and Proximo buttons click handlers inside extractedJsx so that on mobile they scroll to the current step-container
const prevBtnTarget = 'onClick={() => setActiveStep(prev => Math.max(0, prev - 1))}';
const nextBtnTarget = 'onClick={() => setActiveStep(prev => Math.min(steps.length - 1, prev + 1))}';

const prevBtnReplacement = `onClick={() => {
                  const target = Math.max(0, stepIndex - 1);
                  setActiveStep(target);
                  if (isMobileMode) {
                    setTimeout(() => {
                      document.getElementById(\`step-container-\${target}\`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 150);
                  }
                }}`;

const nextBtnReplacement = `onClick={() => {
                  const target = Math.min(steps.length - 1, stepIndex + 1);
                  setActiveStep(target);
                  if (isMobileMode) {
                    setTimeout(() => {
                      document.getElementById(\`step-container-\${target}\`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 150);
                  }
                }}`;

extractedJsx = extractedJsx.replace(prevBtnTarget, prevBtnReplacement);
extractedJsx = extractedJsx.replace(nextBtnTarget, nextBtnReplacement);

// Now define our render function
const renderStepContentDef = `
  const renderStepContent = (stepIndex: number, isMobileMode: boolean = false) => {
    return (
${extractedJsx}
    );
  };
`;

// Insert the definition right before 'return (' around line 368
const returnStmt = '  return (\n    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in text-left">';
const returnStmtIndex = content.indexOf(returnStmt);
if (returnStmtIndex === -1) {
  console.error("Could not find return statement");
  process.exit(1);
}

content = content.substring(0, returnStmtIndex) + renderStepContentDef + '\n' + content.substring(returnStmtIndex);

// Now, update 'steps.map' in the left column.
// Let's view steps.map original block:
//               return (
//                 <button
//                   key={s.id}
//                   onClick={() => setActiveStep(idx)}
//                   className={\`w-full p-4 border text-left rounded-sm transition-all duration-300 relative overflow-hidden flex items-center justify-between \${
//                     isCurrent
//                       ? "bg-barao-plum/20 border-barao-rose/40 text-white shadow-md shadow-barao-rose/5"
//                       : "bg-[#0b0a0a]/70 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200"
//                   }\`}
//                 >
//                 ...
//                 </button>
//               );

const mapButtonStart = '              return (\n                <button\n                  key={s.id}\n                  onClick={() => setActiveStep(idx)}';
const mapButtonStartIndex = content.indexOf(mapButtonStart);
if (mapButtonStartIndex === -1) {
  console.error("Could not find map button start");
  process.exit(1);
}

const mapButtonEnd = '                </button>\n              );\n            })}';
const mapButtonEndIndex = content.indexOf(mapButtonEnd, mapButtonStartIndex);
if (mapButtonEndIndex === -1) {
  console.error("Could not find map button end");
  process.exit(1);
}

const originalButtonBlock = content.substring(mapButtonStartIndex, mapButtonEndIndex + 11); // up to '})}'

const buttonReplacement = `              return (
                <div key={s.id} id={\`step-container-\${idx}\`} className="flex flex-col gap-1 w-full">
                  <button
                    id={\`step-button-\${idx}\`}
                    onClick={() => {
                      setActiveStep(idx);
                      setTimeout(() => {
                        document.getElementById(\`step-container-\${idx}\`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }, 150);
                    }}
                    className={\`w-full p-4 border text-left rounded-sm transition-all duration-300 relative overflow-hidden flex items-center justify-between \${
                      isCurrent
                        ? "bg-barao-plum/20 border-barao-rose/40 text-white shadow-md shadow-barao-rose/5"
                        : "bg-[#0b0a0a]/70 border-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-200"
                    }\`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={\`w-8 h-8 rounded-sm bg-black border flex items-center justify-center transition-all \${
                        isCurrent ? "border-barao-rose text-barao-rose" : "border-white/10 text-zinc-500"
                      }\`}>
                        {s.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold tracking-wide font-serif">{s.title}</h4>
                        <p className="text-[10px] text-zinc-500 leading-tight truncate max-w-[180px] sm:max-w-none lg:max-w-[180px] mt-0.5 font-light">
                          {isDone ? "Sintonizado" : "Inexplorado"}
                        </p>
                      </div>
                    </div>
                    {isDone && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse border border-emerald-400/30" />
                    )}
                  </button>

                  {/* Mobile Accordion Form Content */}
                  {isCurrent && (
                    <div className="block lg:hidden bg-[#0b0a0a]/95 border border-white/5 rounded-sm p-4 sm:p-5 mt-1.5 space-y-6 overflow-hidden">
                      {renderStepContent(idx, true)}
                    </div>
                  )}
                </div>
              );
            })}`;

content = content.replace(originalButtonBlock, buttonReplacement);

// Now, replace the entire right column canvas with just the call to renderStepContent
// The right column starts at:
//         {/* Right Column: Portal Cards Canvas (Single Focus Question Step) */}
//         <div className="lg:col-span-8">
//           <div className="bg-[#0b0a0a] border border-white/5 rounded-sm p-6 sm:p-8 min-h-[480px] flex flex-col justify-between relative overflow-hidden">
//             
//             {/* Ambient Background Grid lines */}
//             <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-40" />
// 
//             <AnimatePresence mode="wait">

const rightColumnStartAnchor = '        {/* Right Column: Portal Cards Canvas (Single Focus Question Step) */}\n        <div className="lg:col-span-8">';
const rightColumnStartIndex = content.indexOf(rightColumnStartAnchor);
if (rightColumnStartIndex === -1) {
  console.error("Could not find right column start anchor after insertion");
  process.exit(1);
}

// Find the closure of the right column bg/container
// Let's find from rightColumnStartIndex the text:
//           </div>
//         </div>
// Which closes the div class="lg:col-span-8" and div class="bg-[#0b0a0a]"
const rightColumnEndAnchor = '          </div>\n        </div>\n\n      </div>'; // closes col and outer grid columns row
const rightColumnEndIndex = content.indexOf(rightColumnEndAnchor, rightColumnStartIndex);
if (rightColumnEndIndex === -1) {
  console.error("Could not find right column end anchor after insertion");
  process.exit(1);
}

const originalRightColumnBlock = content.substring(rightColumnStartIndex, rightColumnEndIndex + 17); // up to closing '</div>'s

const rightColumnReplacement = `        {/* Right Column: Portal Cards Canvas (Single Focus Question Step) */}
        <div className="hidden lg:block lg:col-span-8">
          <div className="bg-[#0b0a0a] border border-white/5 rounded-sm p-6 sm:p-8 min-h-[480px] flex flex-col justify-between relative overflow-hidden">
            
            {/* Ambient Background Grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-40" />

            <AnimatePresence mode="wait">
              {renderStepContent(activeStep, false)}
            </AnimatePresence>

          </div>
        </div>

      </div>`;

content = content.replace(originalRightColumnBlock, rightColumnReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactoring complete!");
