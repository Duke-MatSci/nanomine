function IntelligentCharacterize(userID, jobID, jobType, jobSrcDir, jobDir, webBaseUri, input_type, file_name)

%%% Input Types %%
% 1: Single JPEG Image
% 2: ZIP file containing JPEG images
% 3: Image in .mat file

rc = 0;

try
    path_to_read = [jobSrcDir, '/'];
    path_to_write = [jobSrcDir, '/output'];
    mkdir(path_to_write);
    writeError([path_to_write, '/errors.txt'], '');
    
    %% Specify import function according to input option
    switch str2num(input_type)
        case 1
            img = imread([path_to_read, file_name]);
        case 2
            img = unzip([path_to_read, file_name], [path_to_write, '/', 'input']);
        case 3
            path=[path_to_read,file_name];
            k=load(path);
            [~,f_name,ext]=fileparts(file_name);
            try
                img = getfield(k,f_name);
            catch ex
                rc = 98;
                msg = getReport(ex);
                writeError([path_to_write, '/errors.txt'], 'The variable name inside the material file shold be the same as the name of the file. Technical details below:');
                writeError([path_to_write, '/errors.txt'], msg);
                writeError([path_to_write, '/errors.txt'], newline);
                exit(rc);
            end     
    end
    
    % Otsu binarize

    
    if str2double(input_type) ~= 2
        if length(size(img)) > 2
            img = img(:,:,1);
        end
        if max(img(:))>1
            Target = double(img);
            Target = Target/256; %
            level = graythresh(Target);
            img = imbinarize(Target,level);
        end
        imwrite(256*img, [path_to_write, '/', 'Input1.jpg']);
    end
    
    % Deal with odd shaped images
    md = min(size(img));
    img = img(1:md,1:md);
    
    
    
    
    %% Image read done, now work on output
  
    SDFsize = 200;
    
    vol_frac = mean(img(:));  % Volume fraction
    perim = bwperim(img);
    intf_area = sum(perim(:));  % Interfacial area
    
    [connectivity, concavity] = check_shape(img);
    sdf2d = fftshift(abs(fft2(img-vol_frac)).^2);
    [isotropy, ~] = check_isotropy(sdf2d);
    if all(connectivity == [1, 0]) && (concavity < 1.2)
        % Use descriptors
        cimg = bwlabel(img);
        mcr_method = 'Spheroidal_descriptor';
        [sph.mean_neighbor_distance, ~, ~] = nearest_center_distance(cimg);
        [sph.cluster_number, compactness, c_area, c_radius] = faster_nh_ch(cimg);
        [elong_ratio, ~, orien_angle, rectangularity] = faster_elongation_II(cimg);
        % Calculate mean and variance
        sph.compactness = struct('mean', mean(compactness), 'variance', var(compactness));
        sph.mean_cluster_area = struct('mean', mean(c_area), 'variance', var(c_area));
        sph.mean_cluster_radius = struct('mean', mean(c_radius), 'variance', var(c_radius));
        sph.elongation_ratio = struct('mean', mean(elong_ratio), 'variance', var(elong_ratio));
        sph.orientation_angle = struct('mean', mean(orien_angle), 'variance', var(orien_angle));
        sph.rectangularity = struct('mean', mean(rectangularity), 'variance', var(rectangularity));
        sdf = NaN;
        
    else  % Isotropy check is not included yet
        % Use SDF
        mcr_method = 'SDF';
        
        sdf1d = FFT2oneD(sdf2d);
        fit_result = SDFFit(sdf1d, SDFsize, true, path_to_write);  % true - show fitting image
        sdf.function_type = fit_result('func_type');
        sdf.parameters = fit_result('parameters');
        sdf.function_definition = fit_result('func_def');
        sdf.remarks = fit_result('remarks');
        gof = fit_result('goodness');
        sdf.goodness.rsquare = gof(1);
        sdf.goodness.rmse = gof(2);
        sph = NaN;
        % Save 2D SDF image
        figure('color',[1,1,1])
        hold on;
        clims = [1e4 7e5];
        map = [0.0, 0, 0
            1.0, 0.5, 0
            1.0, 1.0, 0
            1.0, 0, 0];
        imagesc(sdf2d,clims); colormap(map);
        xlim([0 size(img,1)]); ylim([0 size(img,2)]);
        set(gca,'xtick',[]); set(gca,'ytick',[]);
        saveas(gcf,[path_to_write,'/SDF_2D.jpg']);
        hold off 
    end
    % Root of the storage tree
    root.name = 'file_name';
    root.volume_fraction = vol_frac;
    root.interfacial_area = intf_area;
    root.isotropy = isotropy;
    root.characterization = mcr_method;
    root.sdf = sdf;
    root.spherical_descriptor = sph;
    result = jsonencode(root);  % Output data in json
    save([path_to_write, '/output.json'], 'result', '-ascii')
    % save([sp_path, sp_name, '.json'], result)
    
    % Zip files
    zip([path_to_write, '/Results.zip'], {'*'}, [path_to_write, '/']);
    
catch ex
    rc = 99;
    exit(rc);
end
    
    function writeError(file, msg)
    f = fopen(file, 'a+');
    fprintf(f, '%s\n', msg);
    fclose(f);
    end

end