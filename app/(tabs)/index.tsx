import { ThemedText } from "@/components/ThemedText";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { SafeAreaView, StyleSheet, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const ref = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={requestPermission}>
          <MaterialIcons name="camera" size={32} color="black" />
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (permission?.granted && ref.current) {
      const photo = await ref.current.takePictureAsync();
      if (photo?.uri) {
        router.push({
          pathname: "/(tabs)/edit",
          params: { uri: photo?.uri },
        });
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView ref={ref} style={styles.camera} facing={facing}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={takePicture}>
            <MaterialIcons name="camera" size={32} color="white" />
            <ThemedText lightColor="white" darkColor="white">
              Capture
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setFacing(facing === "back" ? "front" : "back")}
          >
            <MaterialIcons name="swap-calls" size={32} color="white" />
            <ThemedText lightColor="white" darkColor="white">
              Switch
            </ThemedText>
          </TouchableOpacity>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
    marginBottom: 20,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    margin: 20,
    gap: 20,
    marginBottom: 40,
  },
  button: {
    alignSelf: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 30,
    padding: 15,
  },
});
