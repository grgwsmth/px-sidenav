// Show UI and set size
figma.showUI(__html__);

figma.ui.resize(600,800);

// Track our navigation components
interface NavData {
	parents: Array<{
		id: string;
		label: string;
		children: Array<{
			id: string;
			label: string;
		}>;
	}>;
}

// Component keys for the navigation elements
const COMPONENT_KEYS = {
	PARENT_LINK: "13c44fe13f8dde5e2b71e7396b8cec831e61113d",
	CHILD_LINK: "24def9ec4389e2bb91bc2d29298a608e3bf9d7cd"
};

// Keep track of created nodes
const createdNodes: { [key: string]: SceneNode } = {};

async function getComponent(key: string): Promise<ComponentNode | null> {
	try {
		return await figma.importComponentByKeyAsync(key);
	} catch (error) {
		console.error(`Error importing component with key ${key}:`, error);
		return null;
	}
}

figma.ui.onmessage = async (msg) => {
	switch (msg.type) {
		case 'add-parent':
			console.log('Parent added in UI');
			break;

		case 'add-child':
			console.log('Child added to parent', msg.parentId);
			break;

		case 'remove-parent':
			console.log('Parent removed', msg.parentId);
			break;

		case 'remove-child':
			console.log('Child removed', msg.childId, 'from parent', msg.parentId);
			break;

		case 'create-nav':
			await createNavigation(msg.data);
			break;

		default:
			console.log('Unknown message type:', msg.type);
	}
};

async function createNavigation(data: NavData) {
	try {
		// Create a frame for the entire navigation
		const navFrame = figma.createFrame();
		navFrame.name = "PX Side Nav";
		navFrame.layoutMode = "VERTICAL";
		navFrame.counterAxisSizingMode = "FIXED";
		const currentHeight = navFrame.height; // store current height
		navFrame.resize(240, currentHeight);   // set width to 240, keep same height
		navFrame.itemSpacing = 0;
		navFrame.paddingTop = 0;
		navFrame.paddingRight = 0;
		navFrame.paddingBottom = 0;
		navFrame.paddingLeft = 0;
		navFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];

		// Load required fonts first
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Regular" });
		await figma.loadFontAsync({ family: "Everyday Sans UI", style: "Medium" });

		// Get the component references
		const parentComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.PARENT_LINK);
		const childComponent = await figma.importComponentByKeyAsync(COMPONENT_KEYS.CHILD_LINK);

		if (!parentComponent || !childComponent) {
			throw new Error('Required components not found in library');
		}

		// Create parent items
		for (const parent of data.parents) {
			// Create a frame for this parent section
			const parentFrame = figma.createFrame();
			parentFrame.name = `${parent.label} Section`;
			parentFrame.layoutMode = "VERTICAL";
			parentFrame.counterAxisSizingMode = "AUTO";
			parentFrame.layoutAlign = "STRETCH";
			parentFrame.itemSpacing = 0;
			parentFrame.fills = [];

			// Create parent instance
			const parentInstance = parentComponent.createInstance();
			parentInstance.layoutAlign = "STRETCH";

			// Set the text property if it exists
			const parentTextNode = parentInstance.findOne(node => node.type === "TEXT") as TextNode;
			if (parentTextNode) {
				parentTextNode.characters = parent.label;
			}

			// Add parent instance to its frame
			parentFrame.appendChild(parentInstance);

			// Create children if they exist
			if (parent.children && parent.children.length > 0) {
				const childrenFrame = figma.createFrame();
				childrenFrame.name = "Children";
				childrenFrame.layoutMode = "VERTICAL";
				childrenFrame.counterAxisSizingMode = "AUTO";
				childrenFrame.layoutAlign = "STRETCH";
				childrenFrame.itemSpacing = 0;
				childrenFrame.paddingLeft = 0;
				childrenFrame.fills = [];

				for (const child of parent.children) {
					// Create child instance
					const childInstance = childComponent.createInstance();
					childInstance.layoutAlign = "STRETCH";

					// Set the text property if it exists
					const childTextNode = childInstance.findOne(node => node.type === "TEXT") as TextNode;
					if (childTextNode) {
						childTextNode.characters = child.label;
					}

					childrenFrame.appendChild(childInstance);
				}

				// Add children frame to parent frame
				parentFrame.appendChild(childrenFrame);
			}

			// Add the parent frame to main navigation frame
			navFrame.appendChild(parentFrame);
			createdNodes[parent.id] = parentFrame;
		}

		// Add the navigation to the page
		figma.currentPage.appendChild(navFrame);

		// Select the navigation frame
		figma.currentPage.selection = [navFrame];

		// Zoom to the navigation
		figma.viewport.scrollAndZoomIntoView([navFrame]);

		// Notify completion
		figma.notify("You're Side Nav component is ready! 🎉");
	} catch (error) {
		console.error('Error creating navigation:', error);
		figma.notify("Error: Could not create navigation. Check console for details.", { error: true });
	}
}

/* NEXT STEPS 
   Get external library assets from LD/PX libraries

// Function to fetch component data from the external library using Figma API
function getLibraryComponents(libraryId) {
	// Use Figma API to retrieve components from the library
	// ... 
	return libraryComponents;
}

// Function to find instances within the current design
function findInstances() {
	const libraryComponents = getLibraryComponents(selectedLibraryId); // Get library data
	const page = figma.currentPage;
	for (let layer of page.children) {
		if (isInstanceFromLibrary(layer, libraryComponents)) {
				// Add this layer to a list of instances 
		}
		// Recursively check child layers
	}
}

// Helper function to check if a layer is an instance of a library component
function isInstanceFromLibrary(layer, libraryComponents) {
	// Compare layer properties with library components to identify a match
	// ... 
	return matchFound;
}

// Event handler for "Find Instances" button click
figma.ui.on('click', 'findInstancesButton', () => {
	findInstances();
	// Update UI to display the list of found instances
});

*/

// At the start of your plugin, add this:
/*
if (figma.currentPage.selection.length > 0) {
	const selected = figma.currentPage.selection[0];
	if (selected.type === "INSTANCE") {
		selected.getMainComponentAsync().then(mainComponent => {
			if (mainComponent) {
				console.log('Component Key:', mainComponent.key);
			}
		});
	}
}
*/

// From Cursor AI
/*
Here's how to use this:
Drag an instance of your component onto the canvas
Select it
Run this code in the Figma console
It will show you:
The component's key
All variant properties
All component properties
All text nodes within the component
Other useful metadata
Once you see this information, you can:
Use the component key for importing
See what variant properties are available to change
See how text nodes are structured within the component
*/

// Debug helper to inspect component properties
async function inspectSelectedComponent() {
	if (figma.currentPage.selection.length === 0) {
		console.log('Please select a component instance');
		return;
	}

	const selected = figma.currentPage.selection[0];
	if (selected.type !== "INSTANCE") {
		console.log('Selected item is not a component instance');
		return;
	}

	// Basic instance properties
	console.log('Instance Properties:', {
		name: selected.name,
		type: selected.type,
		id: selected.id
	});

	// Get variant properties
	console.log('Variant Properties:', {
		variantProperties: selected.variantProperties,
		componentProperties: selected.componentProperties
	});

	// Get text nodes
	const textNodes = selected.findAll(node => node.type === "TEXT");
	console.log('Text Nodes:', textNodes.map(node => {
		if (node.type === "TEXT") {
			return {
				characters: node.characters,
				name: node.name
			};
		}
		return {
			name: node.name
		};
	}));

	// Get main component info
	const mainComponent = await selected.getMainComponentAsync();
	if (mainComponent) {
		console.log('Main Component:', {
			key: mainComponent.key,
			name: mainComponent.name,
			description: mainComponent.description,
			remote: mainComponent.remote
		});
	}
}

// Run the inspection
inspectSelectedComponent();