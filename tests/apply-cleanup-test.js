// Requires reactive.js


const [show, setShow] = useState(false);
const [bla, setBla] = useState(0);
const [ska, setSka] = useState("Bloop!");

apply(show => {
    console.log(`set show to ${show}`);
    if (show) {
        apply(bla => {
            console.log(`Setting up ${bla}`);
            if (bla === 5) {
                apply((ska) => {
                    console.log("ska:", ska);
                    return () => {
                        console.log("cleaning up ska:", ska);
                    }
                }, [ska], true)
            }
            return () => {
                console.log(`Cleaning up ${bla}`);
            }
        }, [bla], true);
    }
}, [show], false);

setShow(true);
setBla(5);
setShow(false);